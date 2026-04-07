// Destructive: wipes every lead for the signed-in user.
//
// Cascades (via schema onDelete: Cascade) take out:
//   • LeadActivity
//   • ScoreFactor
//   • SequenceEnrollment → SequenceSend
//   • ImportRow
//
// We also wipe the user's Import records and reset the onboarding
// "leadsImported" flag so the checklist goes back to its initial state.
//
// Requires a matching `confirm` string in the body as a safety check.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  confirm: z.literal("DELETE ALL LEADS"),
});

export async function POST(req: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type DELETE ALL LEADS to confirm" },
      { status: 400 }
    );
  }

  // Count first so the response tells the user what happened.
  const leadCount = await prisma.lead.count({ where: { userId: user.id } });

  // Cascade-delete everything via the Lead row.
  await prisma.lead.deleteMany({ where: { userId: user.id } });

  // Also wipe the user's Import history so the Imports page is clean.
  await prisma.import.deleteMany({ where: { userId: user.id } });

  // Reset onboarding "leadsImported" so the checklist reflects reality.
  await prisma.userOnboarding.updateMany({
    where: { userId: user.id },
    data: {
      leadsImported: false,
      topLeadsReviewed: false,
      sequenceEnrolled: false,
      revivalCampaignStarted: false,
      completedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    deletedLeads: leadCount,
  });
}
