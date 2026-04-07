// POST /api/leads/:id/missed-opportunity/handle
//
// Marks a missed opportunity as handled by the user. Sets the handledAt
// timestamp (drives the 7-day cooldown) and clears the active flag for
// immediate UI removal.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      missedOpportunity: false,
      missedOpportunityHandledAt: new Date(),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "manual_note",
      payload: {
        action: "missed_opportunity_handled",
        priorReason: lead.missedOpportunityReason,
        priorSeverity: lead.missedOpportunitySeverity,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
