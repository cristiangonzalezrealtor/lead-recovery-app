// Activity signals — counters + heating-up leads.
//
// All read from existing LeadActivity / Lead tables. No new fields.

import { prisma } from "@/lib/db";
import type { Lead, LeadActivity } from "@prisma/client";

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

export interface ActivitySignals {
  counts: { opens24h: number; clicks24h: number; replies24h: number };
  heatingUp: HeatingUpLead[];
  hasAnySignal: boolean;
}

export interface HeatingUpLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  leadType: string;
  scoreBand: string;
  score: number;
  signalText: string;       // e.g. "Opened your last email 2h ago"
  signalAt: Date;
}

const ENGAGEMENT_TYPES = ["email_open", "email_click", "email_reply"] as const;

function describeActivity(a: Pick<LeadActivity, "type">): string {
  switch (a.type) {
    case "email_reply":
      return "Replied";
    case "email_click":
      return "Clicked your last email";
    case "email_open":
      return "Opened your last email";
    default:
      return "Engaged";
  }
}

export async function getActivitySignals(
  userId: string
): Promise<ActivitySignals> {
  const now = Date.now();
  const day = new Date(now - DAY);

  // ── 24h counters via groupBy on LeadActivity ──────────────────
  const recentActivities = await prisma.leadActivity.findMany({
    where: {
      lead: { userId },
      type: { in: ENGAGEMENT_TYPES },
      occurredAt: { gte: day },
    },
    select: { type: true },
  });

  let opens24h = 0;
  let clicks24h = 0;
  let replies24h = 0;
  for (const a of recentActivities) {
    if (a.type === "email_open") opens24h++;
    else if (a.type === "email_click") clicks24h++;
    else if (a.type === "email_reply") replies24h++;
  }

  // ── Heating up: warm/nurture leads with recent engagement, not yet hot ──
  const heatingLeads = await prisma.lead.findMany({
    where: {
      userId,
      scoreBand: { in: ["warm", "nurture"] },
      lastEngagedAt: { not: null, gte: new Date(now - 14 * DAY) },
      status: { notIn: ["replied", "unsubscribed", "bounced", "archived"] },
    },
    orderBy: [{ lastEngagedAt: "desc" }, { score: "desc" }],
    take: 5,
    include: {
      activities: {
        where: { type: { in: ENGAGEMENT_TYPES } },
        orderBy: { occurredAt: "desc" },
        take: 1,
      },
    },
  });

  const heatingUp: HeatingUpLead[] = heatingLeads.map((l) => {
    const latest = l.activities[0];
    const at = latest?.occurredAt ?? l.lastEngagedAt ?? l.updatedAt;
    return {
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      leadType: l.leadType,
      scoreBand: l.scoreBand,
      score: l.score,
      signalText: latest ? describeActivity(latest) : "Recent engagement",
      signalAt: at,
    };
  });

  const hasAnySignal =
    opens24h + clicks24h + replies24h > 0 || heatingUp.length > 0;

  return {
    counts: { opens24h, clicks24h, replies24h },
    heatingUp,
    hasAnySignal,
  };
}
