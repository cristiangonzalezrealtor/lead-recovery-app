// GET /api/unsubscribe/:token
//
// Unauthenticated by design — the signed token is the authorization.
// Flow:
//   1. Verify token kind === "unsubscribe"
//   2. Set lead.status = "unsubscribed"
//   3. Stop every active/paused enrollment for that lead
//   4. Log an email_reply-style activity (type "status_change")
//   5. Re-run enrichLead() so next action and dashboard reflect opt-out
//   6. Render a plain HTML confirmation page

import { NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/email/sign";
import { prisma } from "@/lib/db";
import { enrichLead } from "@/lib/core/enrich";

const PAGE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: ui-sans-serif, Inter, sans-serif; background:#fafaf9; color:#1c1917;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .card { background:#fff; border:1px solid #e7e5e4; border-radius:10px; padding:40px;
          max-width:420px; box-shadow:0 4px 12px rgba(15,23,42,0.06); text-align:center; }
  h1 { font-size:20px; margin:0 0 10px; }
  p { color:#57534e; margin:0; font-size:14px; line-height:1.55; }
</style></head><body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const payload = verifyTrackingToken(params.token);
  if (!payload || payload.kind !== "unsubscribe") {
    return new NextResponse(
      PAGE(
        "Invalid link",
        "This unsubscribe link is no longer valid. If you keep receiving emails, reply with 'unsubscribe'."
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead) {
    return new NextResponse(
      PAGE(
        "Already removed",
        "You have already been removed from this list."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (lead.status !== "unsubscribed") {
    // 1. Mark unsubscribed
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "unsubscribed" },
    });

    // 2. Stop every active or paused enrollment
    await prisma.sequenceEnrollment.updateMany({
      where: { leadId: lead.id, status: { in: ["active", "paused"] } },
      data: {
        status: "stopped",
        completedAt: new Date(),
        pausedReason: "unsubscribed",
      },
    });

    // 3. Log activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "status_change",
        payload: {
          from: lead.status,
          to: "unsubscribed",
          reason: "user_clicked_unsubscribe",
        },
      },
    });

    // 4. Re-enrich
    await enrichLead(lead.id);
  }

  return new NextResponse(
    PAGE(
      "You're unsubscribed",
      "You will not receive any further emails from this sender. Thanks for letting us know."
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
