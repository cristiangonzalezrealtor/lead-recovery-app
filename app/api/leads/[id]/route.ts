// PATCH /api/leads/:id
//
// Allowed fields:
//   • leadType       — change classification (triggers rescore + enrich)
//   • status         — manual status transition (respects terminal states)
//   • sequenceId     — assign a sequence (enforces one-active-per-lead rule)
//   • unenroll: true — remove any active sequence

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rescoreLead } from "@/lib/core/scoring/persist";
import { enrichLead } from "@/lib/core/enrich";
import { enrollLead, unenrollLead } from "@/lib/core/sequence/enroll";
import { isTerminal } from "@/lib/core/status/transitions";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";

const Body = z.object({
  leadType: z
    .enum(["seller", "buyer", "investor", "rental", "valuation", "dormant"])
    .optional(),
  status: z
    .enum([
      "new",
      "classified",
      "scored",
      "nurturing",
      "engaged",
      "replied",
      "appointment_set",
      "active_client",
      "unsubscribed",
      "bounced",
      "archived",
    ])
    .optional(),
  sequenceId: z.string().optional(),
  confirmSwitch: z.boolean().optional(),
  unenroll: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  let rescoreNeeded = false;

  // ── leadType change ─────────────────────────────────────────────
  if (parsed.data.leadType && parsed.data.leadType !== lead.leadType) {
    updates.leadType = parsed.data.leadType;
    rescoreNeeded = true;
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "status_change",
        payload: {
          field: "leadType",
          from: lead.leadType,
          to: parsed.data.leadType,
        },
      },
    });
  }

  // ── status change ───────────────────────────────────────────────
  if (parsed.data.status && parsed.data.status !== lead.status) {
    if (isTerminal(lead.status) && parsed.data.status !== "archived") {
      return NextResponse.json(
        { error: `Cannot transition out of terminal status ${lead.status}` },
        { status: 409 }
      );
    }
    updates.status = parsed.data.status;
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "status_change",
        payload: { from: lead.status, to: parsed.data.status },
      },
    });
  }

  if (Object.keys(updates).length > 0) {
    await prisma.lead.update({ where: { id: lead.id }, data: updates });
  }

  // ── unenroll (before potential new enroll) ──────────────────────
  if (parsed.data.unenroll) {
    await unenrollLead(lead.id, "manual");
  }

  // ── sequence assignment ─────────────────────────────────────────
  let enrollmentResult: Awaited<ReturnType<typeof enrollLead>> | null = null;
  if (parsed.data.sequenceId) {
    enrollmentResult = await enrollLead({
      leadId: lead.id,
      sequenceId: parsed.data.sequenceId,
      confirmSwitch: parsed.data.confirmSwitch,
    });
    if (!enrollmentResult.ok) {
      return NextResponse.json(
        {
          error: "confirmation_required",
          reason: enrollmentResult.reason,
          currentSequenceId: enrollmentResult.currentSequenceId,
          currentSequenceName: enrollmentResult.currentSequenceName,
        },
        { status: 409 }
      );
    }
  }

  if (rescoreNeeded) {
    await rescoreLead(lead.id);
  }
  await enrichLead(lead.id);

  // Any action on a lead satisfies the "review your top 5 leads" step.
  await markOnboardingStep(user.id, "topLeadsReviewed");

  const refreshed = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { scoreFactors: true },
  });
  return NextResponse.json({ lead: refreshed, enrollment: enrollmentResult });
}
