// Confidence — a trust signal for the agent. NOT a lead score.
//
// Answers: "How reliable is the system's read on this lead?"
//   high   = complete data + real engagement (or reliable source)
//   medium = partial data, or full data with no engagement yet
//   low    = missing both contact methods, or sparse data + no engagement
//
// Refinement #2 (Step 5): low confidence is reserved primarily for the
// "cannot contact this lead" case so the wording is concrete.

import type { Confidence, Lead, LeadActivity } from "@prisma/client";

export interface ConfidenceResult {
  level: Confidence;
  reason: string;
}

type LeadInput = Pick<
  Lead,
  | "email"
  | "phone"
  | "firstName"
  | "lastName"
  | "sourceQuality"
>;

const ENGAGEMENT_TYPES = new Set([
  "email_open",
  "email_click",
  "email_reply",
]);

const DAY = 1000 * 60 * 60 * 24;
const RECENT_WINDOW_MS = 30 * DAY;

export function computeConfidence(
  lead: LeadInput,
  activities: Pick<LeadActivity, "type" | "occurredAt">[] = []
): ConfidenceResult {
  const hasEmail = !!lead.email;
  const hasPhone = !!lead.phone;
  const hasName = !!(lead.firstName && lead.lastName);
  const completeData = hasEmail && hasPhone && hasName;
  const partialData = (hasEmail || hasPhone) && hasName;

  const now = Date.now();
  const engagementCount = activities.filter((a) =>
    ENGAGEMENT_TYPES.has(a.type)
  ).length;
  const hasReply = activities.some((a) => a.type === "email_reply");
  const hasRecentEngagement = activities.some(
    (a) =>
      ENGAGEMENT_TYPES.has(a.type) &&
      now - a.occurredAt.getTime() < RECENT_WINDOW_MS
  );

  // ── HIGH ────────────────────────────────────────────────────────
  if (completeData && (hasReply || hasRecentEngagement)) {
    return { level: "high", reason: "Complete data and real engagement" };
  }
  if (completeData && (lead.sourceQuality ?? 0) >= 12) {
    return { level: "high", reason: "Complete data from a reliable source" };
  }

  // ── LOW ─────────────────────────────────────────────────────────
  if (!hasEmail && !hasPhone) {
    return {
      level: "low",
      reason: "No email or phone — cannot contact this lead",
    };
  }
  if (!partialData && engagementCount === 0) {
    return { level: "low", reason: "Sparse contact data, no engagement yet" };
  }

  // ── MEDIUM ──────────────────────────────────────────────────────
  if (completeData) {
    return { level: "medium", reason: "Complete data, no engagement yet" };
  }
  if (engagementCount > 0) {
    return { level: "medium", reason: "Some engagement, partial data" };
  }
  return { level: "medium", reason: "Partial contact data" };
}
