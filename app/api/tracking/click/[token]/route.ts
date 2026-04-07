// GET /api/tracking/click/:token
//
// Records an email_click via ingestActivity() and 302s to the original URL.

import { NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/email/sign";
import { prisma } from "@/lib/db";
import { ingestActivity } from "@/lib/core/activity/ingest";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const payload = verifyTrackingToken(params.token);
  if (!payload || payload.kind !== "click" || !payload.url) {
    return NextResponse.json(
      { error: "Invalid tracking token" },
      { status: 400 }
    );
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: payload.leadId },
    });
    if (lead) {
      await ingestActivity({
        userId: lead.userId,
        leadId: lead.id,
        type: "email_click",
        messageId: payload.sendId,
        metadata: { url: payload.url },
      });
    }
  } catch {
    /* redirect regardless */
  }

  return NextResponse.redirect(payload.url, 302);
}
