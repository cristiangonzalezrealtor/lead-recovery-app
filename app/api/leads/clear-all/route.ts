// Destructive: wipes every lead for the signed-in user.
//
// Cascades (via schema onDelete: Cascade) take out:
//   • LeadActivity, LeadScoreFactor
//   • SequenceEnrollment → SequenceSend
//   • ImportRow (via leadId)
//
// We then wipe Import history (which cascades any remaining ImportRow
// without a leadId), and reset onboarding flags.
//
// All operations run inside a single transaction so a partial failure
// doesn't leave the user in a half-deleted state.
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
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type DELETE ALL LEADS exactly to confirm." },
      { status: 400 }
    );
  }

  try {
    const leadCount = await prisma.lead.count({
      where: { userId: user.id },
    });

    // Order matters: leads first (cascades to activities/factors/enrollments/
    // importRows referencing leadId), then imports (cascades to any orphan
    // importRows without a leadId), then onboarding reset.
    await prisma.$transaction([
      prisma.lead.deleteMany({ where: { userId: user.id } }),
      prisma.import.deleteMany({ where: { userId: user.id } }),
      prisma.userOnboarding.updateMany({
        where: { userId: user.id },
        data: {
          leadsImported: false,
          topLeadsReviewed: false,
          sequenceEnrolled: false,
          revivalCampaignStarted: false,
          completedAt: null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, deletedLeads: leadCount });
  } catch (err: any) {
    console.error("[clear-all-leads] failed:", err);
    return NextResponse.json(
      {
        error: "Delete failed. Check server logs.",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
