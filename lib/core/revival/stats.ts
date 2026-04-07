// Revival performance metrics — powers the dashboard dormant section
// and the /revival page.

import { prisma } from "@/lib/db";

const DAY = 1000 * 60 * 60 * 24;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export interface RevivalStats {
  dormantTotal: number;
  dormantByProbability: { high: number; medium: number; low: number; none: number };
  revivedThisWeek: number;
  revivedThisMonth: number;
  revivalRateMonthly: number; // 0.0 – 1.0
  topRevivalSequences: Array<{
    sequenceId: string;
    name: string;
    enrolledCount: number;
    repliedCount: number;
    engagedCount: number;
  }>;
  recentlyRevived: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    leadType: string;
    score: number;
    revivedAt: Date | null;
  }>;
}

export async function getRevivalStats(userId: string): Promise<RevivalStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK);
  const monthAgo = new Date(now.getTime() - MONTH);

  // Dormant totals + breakdown
  const [dormantTotal, high, medium, low, none] = await Promise.all([
    prisma.lead.count({ where: { userId, isDormant: true } }),
    prisma.lead.count({ where: { userId, isDormant: true, revivalProbability: "high" } }),
    prisma.lead.count({ where: { userId, isDormant: true, revivalProbability: "medium" } }),
    prisma.lead.count({ where: { userId, isDormant: true, revivalProbability: "low" } }),
    prisma.lead.count({ where: { userId, isDormant: true, revivalProbability: "none" } }),
  ]);

  // Revived counts
  const [revivedThisWeek, revivedThisMonth] = await Promise.all([
    prisma.lead.count({ where: { userId, revivedAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { userId, revivedAt: { gte: monthAgo } } }),
  ]);

  // Dormant cohort size 30 days ago — for rate calculation.
  // Approximation: count leads that had a dormant activity window ending
  // before the month cutoff. Fall back to `dormantTotal + revivedThisMonth`
  // as the denominator since exact historical dormant counts are hard
  // without a snapshot table.
  const denominator = dormantTotal + revivedThisMonth;
  const revivalRateMonthly = denominator > 0 ? revivedThisMonth / denominator : 0;

  // Top revival sequences — dormant-type sequences with the best outcomes.
  const dormantSequences = await prisma.sequence.findMany({
    where: {
      OR: [{ userId, leadType: "dormant" }, { isTemplate: true, userId: null, leadType: "dormant" }],
    },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: {
        select: {
          id: true,
          lead: { select: { status: true } },
        },
      },
    },
  });

  const topRevivalSequences = dormantSequences
    .map((s) => {
      const enrolledCount = s.enrollments.length;
      const repliedCount = s.enrollments.filter(
        (e) => e.lead.status === "replied" || e.lead.status === "engaged" || e.lead.status === "appointment_set"
      ).length;
      const engagedCount = s.enrollments.filter((e) =>
        ["engaged", "appointment_set", "active_client"].includes(e.lead.status)
      ).length;
      return {
        sequenceId: s.id,
        name: s.name,
        enrolledCount,
        repliedCount,
        engagedCount,
      };
    })
    .filter((s) => s.enrolledCount > 0)
    .sort((a, b) => b.repliedCount - a.repliedCount)
    .slice(0, 5);

  const recentlyRevived = await prisma.lead.findMany({
    where: { userId, revivedAt: { gte: weekAgo } },
    orderBy: { revivedAt: "desc" },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      leadType: true,
      score: true,
      revivedAt: true,
    },
  });

  return {
    dormantTotal,
    dormantByProbability: { high, medium, low, none },
    revivedThisWeek,
    revivedThisMonth,
    revivalRateMonthly,
    topRevivalSequences,
    recentlyRevived,
  };
}
