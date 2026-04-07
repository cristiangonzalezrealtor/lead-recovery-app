// enrichLead() — single entry point that runs revival, confidence,
// missed-opportunity detection, next-action, and AI summary, then
// persists everything back to the lead.
//
// Called by:
//   • import commit (after scoring)
//   • PATCH /api/leads/:id
//   • activity ingestion (open/click/reply)
//   • sequence enroll / unenroll

import { prisma } from "@/lib/db";
import { evaluateRevival } from "@/lib/core/revival";
import { computeNextAction } from "@/lib/core/next-action";
import { generateAiSummary } from "@/lib/core/ai-summary";
import { computeConfidence } from "@/lib/core/confidence";
import { detectMissedOpportunity } from "@/lib/core/missed-opportunity";

const FOURTEEN_DAYS = 1000 * 60 * 60 * 24 * 14;
const ENGAGEMENT_TYPES = new Set([
  "email_open",
  "email_click",
  "email_reply",
]);

export async function enrichLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { orderBy: { occurredAt: "desc" }, take: 100 },
      enrollments: {
        where: { status: "active" },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!lead) return null;

  const revival = evaluateRevival(lead, lead.activities);

  const now = Date.now();
  const hasRecentEngagement = lead.activities.some(
    (a) =>
      ENGAGEMENT_TYPES.has(a.type) &&
      now - a.occurredAt.getTime() < FOURTEEN_DAYS
  );

  const nextAction = computeNextAction({
    lead: {
      ...lead,
      isDormant: revival.isDormant,
      revivalProbability: revival.probability,
    },
    enrollment: lead.enrollments[0] ?? null,
    hasRecentEngagement,
  });

  const confidence = computeConfidence(lead, lead.activities);

  const aiSummary = generateAiSummary({
    ...lead,
    isDormant: revival.isDormant,
    revivalProbability: revival.probability,
  });

  // ── Missed opportunity detection (centralized) ────────────────
  const missed = detectMissedOpportunity(
    lead,
    lead.activities,
    lead.enrollments[0] ?? null,
    now
  );

  const missedFields = missed
    ? {
        missedOpportunity: true,
        missedOpportunityReason: missed.reason,
        missedOpportunitySince: missed.since,
        missedOpportunitySeverity: missed.severity,
        missedOpportunityKind: missed.kind,
      }
    : {
        missedOpportunity: false,
        missedOpportunityReason: null,
        missedOpportunitySince: null,
        missedOpportunitySeverity: null,
        missedOpportunityKind: null,
      };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      isDormant: revival.isDormant,
      revivalProbability: revival.probability,
      revivalReasons: revival.reasons,
      aiSummary,
      nextAction: nextAction.action,
      nextActionReason: nextAction.reason,
      nextActionPriority: nextAction.priority,
      nextActionGeneratedAt: new Date(),
      confidence: confidence.level,
      confidenceReason: confidence.reason,
      ...missedFields,
    },
  });

  return { revival, nextAction, aiSummary, confidence, missed };
}
