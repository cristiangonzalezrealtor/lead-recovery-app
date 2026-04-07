// POST /api/webhooks/inbound-reply/:secret
//
// Inbound email webhook for reply ingestion (Postmark/Mailgun/etc.).
// Authenticates via the Webhook.secret from the user's Webhook record.
//
// Expected payload (shape-tolerant):
//   {
//     from:       "leadname@example.com"     // or "Lead <leadname@example.com>"
//     to:         string | string[]
//     subject:    string
//     text:       string
//     messageId:  string (optional)
//     inReplyTo:  string (optional)
//   }
//
// Behavior:
//   1. Validate the secret
//   2. Extract sender email from `from`
//   3. Look up the lead by (userId, email)
//   4. ingestActivity(reply) — which already runs onReply(), pauses
//      enrollments, and calls enrichLead()

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ingestActivity } from "@/lib/core/activity/ingest";

const Body = z.object({
  from: z.union([z.string(), z.array(z.string())]),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

function extractEmail(field: string | string[]): string | null {
  const raw = Array.isArray(field) ? field[0] : field;
  const match = raw?.match(EMAIL_RE);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: { secret: string } }
) {
  // 1. Look up the webhook by secret
  const webhook = await prisma.webhook.findUnique({
    where: { secret: params.secret },
  });
  if (!webhook || !webhook.isActive) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  // 2. Parse payload
  const payload = await req.json().catch(() => null);
  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const senderEmail = extractEmail(parsed.data.from);
  if (!senderEmail) {
    return NextResponse.json({ error: "Missing sender email" }, { status: 400 });
  }

  // 3. Record delivery for audit purposes
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      payload: parsed.data as object,
      source: "email_reply",
    },
  });

  // 4. Find lead for this user
  const lead = await prisma.lead.findUnique({
    where: {
      userId_email: {
        userId: webhook.userId,
        email: senderEmail,
      },
    },
  });

  if (!lead) {
    return NextResponse.json(
      {
        ok: false,
        reason: "lead_not_found",
        deliveryId: delivery.id,
      },
      { status: 202 } // still accepted — we logged the delivery
    );
  }

  // 5. Ingest — this does: activity log, onReply() status, pause
  //    active enrollments, enrichLead()
  await ingestActivity({
    userId: webhook.userId,
    leadId: lead.id,
    type: "email_reply",
    messageId: parsed.data.messageId,
    metadata: {
      subject: parsed.data.subject,
      snippet: parsed.data.text?.slice(0, 500),
      inReplyTo: parsed.data.inReplyTo,
      webhookDeliveryId: delivery.id,
    },
  });

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { leadId: lead.id },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
