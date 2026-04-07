// Thin wrapper that computes a score and persists it.
// Called by: import commit, manual edit, nightly recompute worker.
//
// Also advances the outbound status pipeline:
//   new → classified → scored

import { prisma } from "@/lib/db";
import { scoreLead } from "./index";
import { onScore } from "@/lib/core/status/transitions";

export async function rescoreLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
    },
  });
  if (!lead) return null;

  const result = scoreLead({
    lead,
    recentActivities: lead.activities,
  });

  const nextStatus = onScore(lead.status);

  await prisma.$transaction([
    prisma.leadScoreFactor.deleteMany({ where: { leadId } }),
    prisma.leadScoreFactor.createMany({
      data: result.factors.map((f) => ({
        leadId,
        factorKey: f.key,
        factorLabel: f.label,
        points: f.points,
      })),
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        score: result.total,
        scoreBand: result.band,
        status: nextStatus,
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        type: "score_change",
        payload: { score: result.total, band: result.band },
      },
    }),
  ]);

  return result;
}
