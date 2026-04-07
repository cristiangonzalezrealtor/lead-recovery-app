// Act Now ranking (adjustment #6 + Phase 1.6 refinement #1).
//
// Ranking algorithm:
//   1. All leads with `nextActionPriority === "high"` float to the top.
//   2. Within that, apply the group priority:
//        replied → hot_untouched → revived → high_score_recent
//   3. Secondary sort: most recent activity / urgency / score.

import { prisma } from "@/lib/db";

const DAY = 1000 * 60 * 60 * 24;

type Group = "replied" | "hot_untouched" | "revived" | "high_score_recent";
const GROUP_ORDER: Record<Group, number> = {
  replied: 0,
  hot_untouched: 1,
  revived: 2,
  high_score_recent: 3,
};

export async function getActNowLeads(userId: string, limit = 20) {
  const now = Date.now();

  const [replied, hotUntouched, revived, recentHighScore] = await Promise.all([
    prisma.lead.findMany({
      where: { userId, status: "replied" },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.lead.findMany({
      where: {
        userId,
        scoreBand: "hot",
        lastContactedAt: null,
        status: { notIn: ["replied", "unsubscribed", "bounced", "archived"] },
      },
      orderBy: { score: "desc" },
      take: limit,
    }),
    prisma.lead.findMany({
      where: {
        userId,
        isDormant: true,
        lastEngagedAt: { gte: new Date(now - 7 * DAY) },
      },
      orderBy: { lastEngagedAt: "desc" },
      take: limit,
    }),
    prisma.lead.findMany({
      where: {
        userId,
        score: { gte: 70 },
        lastEngagedAt: { gte: new Date(now - 3 * DAY) },
        status: { notIn: ["replied", "archived"] },
      },
      orderBy: [{ score: "desc" }, { lastEngagedAt: "desc" }],
      take: limit,
    }),
  ]);

  // Build unified candidate list with group tags.
  const candidates: { group: Group; lead: (typeof replied)[number] }[] = [];
  const seen = new Set<string>();
  const push = (group: Group, leads: typeof replied) => {
    for (const lead of leads)
      if (!seen.has(lead.id)) {
        seen.add(lead.id);
        candidates.push({ group, lead });
      }
  };
  push("replied", replied);
  push("hot_untouched", hotUntouched);
  push("revived", revived);
  push("high_score_recent", recentHighScore);

  // Refinement #1 — priority-first sort.
  candidates.sort((a, b) => {
    // 1. nextActionPriority === "high" floats to the top
    const aHigh = a.lead.nextActionPriority === "high" ? 0 : 1;
    const bHigh = b.lead.nextActionPriority === "high" ? 0 : 1;
    if (aHigh !== bHigh) return aHigh - bHigh;

    // 2. Group priority
    if (GROUP_ORDER[a.group] !== GROUP_ORDER[b.group])
      return GROUP_ORDER[a.group] - GROUP_ORDER[b.group];

    // 3. Urgency: most recent activity first
    const aT = a.lead.lastEngagedAt?.getTime() ?? a.lead.updatedAt.getTime();
    const bT = b.lead.lastEngagedAt?.getTime() ?? b.lead.updatedAt.getTime();
    if (aT !== bT) return bT - aT;

    // 4. Tie-break on score
    return b.lead.score - a.lead.score;
  });

  return candidates.slice(0, limit);
}

export const GROUP_LABELS: Record<string, string> = {
  replied: "Replied — respond now",
  hot_untouched: "Hot, untouched",
  revived: "Just revived",
  high_score_recent: "Heating up fast",
};
