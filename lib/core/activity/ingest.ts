// Shared activity ingestion logic used by the open/click/reply endpoints.
//
// Side effects per type:
//   email_open   → record activity, bump lastEngagedAt
//                  if status === "replied"  → engaged
//   email_click  → same as open
//   email_reply  → record activity, bump lastEngagedAt
//                  transition status → replied (non-terminal)
//                  pause any active sequence enrollment
//
// Always re-runs enrichLead() so next action + AI summary stay fresh.

import { prisma } from "@/lib/db";
import { enrichLead } from "@/lib/core/enrich";
import { onEngagement, onReply } from "@/lib/core/status/transitions";

export type InboundActivityType = "email_open" | "email_click" | "email_reply";

export async function ingestActivity(params: {
  userId: string;
  leadId: string;
  type: InboundActivityType;
  messageId?: string;
  metadata?: Record<string, unknown>;
}) {
  const lead = await prisma.lead.findFirst({
    where: { id: params.leadId, userId: params.userId },
  });
  if (!lead) return { ok: false as const, error: "not_found" };

  const now = new Date();

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: params.type,
      payload: {
        messageId: params.messageId ?? null,
        ...(params.metadata ?? {}),
      },
      occurredAt: now,
    },
  });

  // Bump lastEngagedAt for any inbound signal.
  const leadUpdates: Record<string, unknown> = { lastEngagedAt: now };

  // Phase 3 — revival tracking: if this lead was dormant, stamp revivedAt
  // the first time they engage. Subsequent engagements don't overwrite.
  if (lead.isDormant && !lead.revivedAt) {
    leadUpdates.revivedAt = now;
    leadUpdates.isDormant = false;
  }

  if (params.type === "email_reply") {
    leadUpdates.status = onReply(lead.status);

    // Pause any active enrollment — global "stop on reply" guardrail.
    await prisma.sequenceEnrollment.updateMany({
      where: { leadId: lead.id, status: "active" },
      data: { status: "paused", pausedReason: "reply_received" },
    });
  } else {
    // open / click → if already replied, advance to engaged.
    const nextStatus = onEngagement(lead.status);
    if (nextStatus !== lead.status) leadUpdates.status = nextStatus;
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: leadUpdates,
  });

  await enrichLead(lead.id);

  return { ok: true as const };
}
