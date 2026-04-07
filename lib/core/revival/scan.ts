// Bulk dormant-scan worker.
//
// Walks every non-terminal lead for a user, runs evaluateRevival(),
// and persists isDormant / revivalProbability / revivalReasons.
//
// Called by POST /api/leads/dormant-scan (cron, daily) and also
// manually from the revival campaign UI.

import { prisma } from "@/lib/db";
import { evaluateRevival } from "./index";
import { enrichLead } from "@/lib/core/enrich";

export interface ScanResult {
  scanned: number;
  newlyDormant: number;
  stillDormant: number;
  noLongerDormant: number;
  skipped: number;
}

export async function scanDormant(userId?: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanned: 0,
    newlyDormant: 0,
    stillDormant: 0,
    noLongerDormant: 0,
    skipped: 0,
  };

  const where: Record<string, unknown> = {
    status: { notIn: ["unsubscribed", "bounced", "archived", "active_client"] },
  };
  if (userId) where.userId = userId;

  const leads = await prisma.lead.findMany({
    where,
    include: { activities: { orderBy: { occurredAt: "desc" }, take: 100 } },
    take: 5000,
  });

  for (const lead of leads) {
    result.scanned++;
    const revival = evaluateRevival(lead, lead.activities);

    const wasDormant = lead.isDormant;
    const nowDormant = revival.isDormant;

    if (wasDormant === nowDormant) {
      // Still matches — just refresh reasons + probability in place.
      if (
        JSON.stringify(lead.revivalReasons) !== JSON.stringify(revival.reasons) ||
        lead.revivalProbability !== revival.probability
      ) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            revivalProbability: revival.probability,
            revivalReasons: revival.reasons,
          },
        });
      }
      if (nowDormant) result.stillDormant++;
      else result.skipped++;
      continue;
    }

    // State flipped — run full enrichment so next action refreshes too.
    await enrichLead(lead.id);
    if (nowDormant) result.newlyDormant++;
    else result.noLongerDormant++;
  }

  return result;
}
