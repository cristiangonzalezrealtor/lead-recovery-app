// GET /api/tracking/open/:token
//
// Returns a 1×1 transparent GIF and records an email_open activity via
// the shared ingestActivity() helper. Never throws — tracking failures
// must not break pixel delivery.

import { NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/email/sign";
import { prisma } from "@/lib/db";
import { ingestActivity } from "@/lib/core/activity/ingest";

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const payload = verifyTrackingToken(params.token);
  if (payload && payload.kind === "open") {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: payload.leadId },
      });
      if (lead) {
        await ingestActivity({
          userId: lead.userId,
          leadId: lead.id,
          type: "email_open",
          messageId: payload.sendId,
        });
      }
    } catch {
      /* never break pixel delivery */
    }
  }

  return new NextResponse(GIF, {
    status: 200,
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}
