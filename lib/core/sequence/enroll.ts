// Enrollment helper — enforces adjustment #3:
// "Only one active sequence per lead. Require confirmation before switching."
//
// Also advances the outbound status pipeline:
//   scored → nurturing

import { prisma } from "@/lib/db";
import { onEnroll } from "@/lib/core/status/transitions";
import { enrichLead } from "@/lib/core/enrich";
import { normalizeToSendWindow } from "./send-window";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";

export async function getActiveEnrollment(leadId: string) {
  return prisma.sequenceEnrollment.findFirst({
    where: { leadId, status: "active" },
    include: { sequence: true },
  });
}

export async function enrollLead(params: {
  leadId: string;
  sequenceId: string;
  confirmSwitch?: boolean;
}) {
  const existing = await getActiveEnrollment(params.leadId);

  if (existing && existing.sequenceId !== params.sequenceId) {
    if (!params.confirmSwitch) {
      return {
        ok: false as const,
        reason: "switch_requires_confirmation" as const,
        currentSequenceId: existing.sequenceId,
        currentSequenceName: existing.sequence.name,
      };
    }
    await prisma.sequenceEnrollment.update({
      where: { id: existing.id },
      data: { status: "stopped", completedAt: new Date() },
    });
    await prisma.leadActivity.create({
      data: {
        leadId: params.leadId,
        type: "enrollment_stopped",
        payload: { sequenceId: existing.sequenceId, reason: "switched" },
      },
    });
  }

  if (existing && existing.sequenceId === params.sequenceId) {
    return { ok: true as const, enrollmentId: existing.id, created: false };
  }

  // Normalize the first send time into the user's send window so we
  // don't queue a send for 11pm local time.
  const leadForWindow = await prisma.lead.findUnique({
    where: { id: params.leadId },
    include: { user: { include: { brandProfile: true } } },
  });
  const brand = leadForWindow?.user.brandProfile;
  const firstSendAt = brand
    ? normalizeToSendWindow(new Date(), {
        startHour: brand.sendWindowStartHour,
        endHour: brand.sendWindowEndHour,
        timezone: brand.timezone,
      })
    : new Date();

  const created = await prisma.sequenceEnrollment.create({
    data: {
      leadId: params.leadId,
      sequenceId: params.sequenceId,
      status: "active",
      currentStep: 0,
      nextSendAt: firstSendAt,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: params.leadId,
      type: "enrollment_started",
      payload: { sequenceId: params.sequenceId },
    },
  });

  // Transition status (scored/classified/new → nurturing).
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
  if (lead) {
    const nextStatus = onEnroll(lead.status);
    if (nextStatus !== lead.status) {
      await prisma.lead.update({
        where: { id: params.leadId },
        data: { status: nextStatus },
      });
    }
  }

  // Re-enrich so next-action reflects the nurturing state.
  await enrichLead(params.leadId);

  // Onboarding — fire sequenceEnrolled unconditionally; fire
  // revivalCampaignStarted if this sequence is a dormant sequence.
  if (leadForWindow) {
    await markOnboardingStep(leadForWindow.userId, "sequenceEnrolled");
    const sequence = await prisma.sequence.findUnique({
      where: { id: params.sequenceId },
      select: { leadType: true },
    });
    if (sequence?.leadType === "dormant") {
      await markOnboardingStep(leadForWindow.userId, "revivalCampaignStarted");
    }
  }

  return { ok: true as const, enrollmentId: created.id, created: true };
}

export async function unenrollLead(leadId: string, reason = "manual") {
  const active = await getActiveEnrollment(leadId);
  if (!active) return { ok: true as const, wasActive: false };
  await prisma.sequenceEnrollment.update({
    where: { id: active.id },
    data: { status: "stopped", pausedReason: reason, completedAt: new Date() },
  });
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: "enrollment_stopped",
      payload: { sequenceId: active.sequenceId, reason },
    },
  });
  await enrichLead(leadId);
  return { ok: true as const, wasActive: true };
}
