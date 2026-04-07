// SequenceService.tick() — cron-driven sequence executor.
//
// Phase 2.5 additions:
//   • Per-tick global throttle (TICK_LIMIT_GLOBAL, default 50)
//   • Per-user throttle (TICK_LIMIT_PER_USER, default 20)
//   • Duplicate send guard (unique [enrollmentId, stepId])
//   • Send-window enforcement — if now is outside the user's window,
//     reschedule nextSendAt into the next legal slot and skip the tick
//   • Email identity (fromLine from brand.agentName, replyTo = user.email)
//
// Guardrails per enrollment (unchanged): terminal status, replied, no
// email, no brand — all skip/stop without sending.

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { renderSend } from "./render";
import { enrichLead } from "@/lib/core/enrich";
import {
  normalizeToSendWindow,
  isInSendWindow,
} from "./send-window";

const TICK_LIMIT_GLOBAL = parseInt(
  process.env.TICK_LIMIT_GLOBAL ?? "50",
  10
);
const TICK_LIMIT_PER_USER = parseInt(
  process.env.TICK_LIMIT_PER_USER ?? "20",
  10
);

export interface TickResult {
  scheduled: number;
  sent: number;
  failed: number;
  skipped: number;
  completed: number;
  deferredForWindow: number;
  throttled: number;
  details: Array<{
    sendId?: string;
    enrollmentId: string;
    status: string;
    error?: string;
  }>;
}

export async function tickSequences(now = new Date()): Promise<TickResult> {
  const result: TickResult = {
    scheduled: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    completed: 0,
    deferredForWindow: 0,
    throttled: 0,
    details: [],
  };

  // Pull up to 4× the global limit so we can still hit the cap after
  // filtering (deferred-for-window enrollments don't count).
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "active",
      nextSendAt: { lte: now },
    },
    include: {
      lead: { include: { user: { include: { brandProfile: true } } } },
      sequence: { include: { steps: { orderBy: { stepIndex: "asc" } } } },
    },
    orderBy: { nextSendAt: "asc" },
    take: TICK_LIMIT_GLOBAL * 4,
  });

  const perUserCount = new Map<string, number>();
  let globalSent = 0;

  for (const enrollment of dueEnrollments) {
    if (globalSent >= TICK_LIMIT_GLOBAL) {
      result.throttled++;
      continue;
    }
    const lead = enrollment.lead;
    const userId = lead.userId;
    const perUser = perUserCount.get(userId) ?? 0;
    if (perUser >= TICK_LIMIT_PER_USER) {
      result.throttled++;
      continue;
    }

    const brand = lead.user.brandProfile;

    // ── Guardrails ──────────────────────────────────────────────
    if (!brand) {
      result.skipped++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: "no_brand_profile",
      });
      continue;
    }
    if (
      ["unsubscribed", "bounced", "archived", "active_client"].includes(
        lead.status
      )
    ) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "stopped",
          completedAt: new Date(),
          pausedReason: `lead_${lead.status}`,
        },
      });
      result.skipped++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: `stopped_${lead.status}`,
      });
      continue;
    }
    if (lead.status === "replied") {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "paused", pausedReason: "reply_received" },
      });
      result.skipped++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: "paused_reply",
      });
      continue;
    }
    if (!lead.email) {
      result.skipped++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: "no_email_address",
      });
      continue;
    }

    // ── Send window enforcement ────────────────────────────────
    const windowCfg = {
      startHour: brand.sendWindowStartHour,
      endHour: brand.sendWindowEndHour,
      timezone: brand.timezone,
    };
    if (!isInSendWindow(now, windowCfg)) {
      const nextSlot = normalizeToSendWindow(now, windowCfg);
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { nextSendAt: nextSlot },
      });
      result.deferredForWindow++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: "deferred_outside_window",
      });
      continue;
    }

    const step = enrollment.sequence.steps[enrollment.currentStep];
    if (!step) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", completedAt: new Date() },
      });
      result.completed++;
      continue;
    }

    // ── Duplicate send guard ───────────────────────────────────
    // The schema has a unique [enrollmentId, stepId] constraint. We
    // try to create the row and catch the unique violation so we can
    // advance the enrollment instead of sending again.
    let sendRow;
    try {
      sendRow = await prisma.sequenceSend.create({
        data: {
          enrollmentId: enrollment.id,
          stepId: step.id,
          scheduledAt: enrollment.nextSendAt ?? new Date(),
          status: "scheduled",
        },
      });
      result.scheduled++;
    } catch (err: unknown) {
      // Unique violation — this step was already sent. Advance enrollment.
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        const nextStep = enrollment.sequence.steps[enrollment.currentStep + 1];
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: nextStep
            ? {
                currentStep: enrollment.currentStep + 1,
                nextSendAt: new Date(
                  Date.now() +
                    Math.max(
                      0,
                      (nextStep.dayOffset - step.dayOffset) *
                        24 *
                        60 *
                        60 *
                        1000
                    )
                ),
              }
            : {
                status: "completed",
                completedAt: new Date(),
                nextSendAt: null,
              },
        });
        result.skipped++;
        result.details.push({
          enrollmentId: enrollment.id,
          status: "duplicate_step_advanced",
        });
        continue;
      }
      result.failed++;
      result.details.push({
        enrollmentId: enrollment.id,
        status: "send_row_error",
        error: String(err),
      });
      continue;
    }

    // ── Render ────────────────────────────────────────────────
    let rendered;
    try {
      rendered = renderSend({
        step,
        lead,
        brand,
        user: lead.user,
        sendId: sendRow.id,
      });
    } catch (err) {
      await prisma.sequenceSend.update({
        where: { id: sendRow.id },
        data: { status: "failed" },
      });
      result.failed++;
      result.details.push({
        sendId: sendRow.id,
        enrollmentId: enrollment.id,
        status: "render_error",
        error: String(err),
      });
      continue;
    }

    // ── Send ──────────────────────────────────────────────────
    try {
      const res = await sendEmail({
        to: lead.email,
        from: rendered.fromLine,
        replyTo: rendered.replyTo,
        subject: rendered.subject,
        html: rendered.htmlBody,
        text: rendered.textBody,
      });

      await prisma.sequenceSend.update({
        where: { id: sendRow.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          renderedSubject: rendered.subject,
          renderedBody: rendered.textBody,
          messageId: res.messageId,
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "email_sent",
          payload: {
            sendId: sendRow.id,
            stepIndex: enrollment.currentStep,
            sequenceId: enrollment.sequenceId,
            messageId: res.messageId,
          },
        },
      });

      // Advance enrollment with next-send-time normalized into window.
      const nextStep = enrollment.sequence.steps[enrollment.currentStep + 1];
      if (!nextStep) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            currentStep: enrollment.currentStep + 1,
            nextSendAt: null,
          },
        });
        result.completed++;
      } else {
        const delayMs =
          (nextStep.dayOffset - step.dayOffset) * 24 * 60 * 60 * 1000;
        const raw = new Date(Date.now() + Math.max(0, delayMs));
        const normalized = normalizeToSendWindow(raw, windowCfg);
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: enrollment.currentStep + 1,
            nextSendAt: normalized,
          },
        });
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      });

      await enrichLead(lead.id);

      result.sent++;
      globalSent++;
      perUserCount.set(userId, perUser + 1);
      result.details.push({
        sendId: sendRow.id,
        enrollmentId: enrollment.id,
        status: "sent",
      });
    } catch (err) {
      await prisma.sequenceSend.update({
        where: { id: sendRow.id },
        data: { status: "failed" },
      });
      result.failed++;
      result.details.push({
        sendId: sendRow.id,
        enrollmentId: enrollment.id,
        status: "send_error",
        error: String(err),
      });
    }
  }

  return result;
}
