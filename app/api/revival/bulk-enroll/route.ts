// POST /api/revival/bulk-enroll
//
// Enroll every dormant lead matching a filter into a revival sequence.
// Used by the "Start revival campaign" button on /revival.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enrollLead } from "@/lib/core/sequence/enroll";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";

const Body = z.object({
  sequenceId: z.string().min(1),
  probability: z.enum(["high", "medium", "low"]).optional(),
  maxLeads: z.number().int().positive().max(500).default(100),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const sequence = await prisma.sequence.findFirst({
    where: {
      id: parsed.data.sequenceId,
      OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
    },
  });
  if (!sequence)
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  if (sequence.leadType !== "dormant")
    return NextResponse.json(
      { error: "Only dormant sequences can be used for bulk revival" },
      { status: 400 }
    );

  const leads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      isDormant: true,
      status: { notIn: ["unsubscribed", "bounced", "archived", "active_client"] },
      email: { not: null },
      ...(parsed.data.probability
        ? { revivalProbability: parsed.data.probability }
        : {}),
    },
    take: parsed.data.maxLeads,
    orderBy: [{ revivalProbability: "asc" }, { score: "desc" }],
  });

  let enrolled = 0;
  let skipped = 0;
  for (const lead of leads) {
    const result = await enrollLead({
      leadId: lead.id,
      sequenceId: parsed.data.sequenceId,
      confirmSwitch: false, // don't hijack leads already in another sequence
    });
    if (result.ok) enrolled++;
    else skipped++;
  }

  if (enrolled > 0) {
    await markOnboardingStep(user.id, "revivalCampaignStarted");
    await markOnboardingStep(user.id, "sequenceEnrolled");
  }

  return NextResponse.json({ enrolled, skipped, total: leads.length });
}
