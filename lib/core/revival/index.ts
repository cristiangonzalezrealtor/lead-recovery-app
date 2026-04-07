// RevivalService — detects dormant leads and scores revival probability.
//
// Dormant criteria (all required):
//   • no reply in 30+ days
//   • no engagement event in 30+ days
//   • no manual note/appointment in 30+ days
//   • not in a terminal status (unsubscribed, bounced, active_client, archived)
//
// Probability weighting:
//   High hits: seller/investor type, source quality ≥12, <12mo since contact
//   Medium hits: prior engagement, complete contact data, 12–24mo since contact
//   Result: ≥2 high → high · ≥2 total → medium · otherwise → low

import type { Lead, LeadActivity, LeadStatus, RevivalProb } from "@prisma/client";

const DAY = 1000 * 60 * 60 * 24;
const THIRTY_DAYS = 30 * DAY;
const TWELVE_MONTHS = 365 * DAY;
const TWENTY_FOUR_MONTHS = 2 * 365 * DAY;

const ENGAGEMENT_TYPES = new Set([
  "email_open",
  "email_click",
  "email_reply",
  "manual_note",
]);

const TERMINAL: LeadStatus[] = [
  "unsubscribed",
  "bounced",
  "active_client",
  "archived",
];

export interface RevivalResult {
  isDormant: boolean;
  probability: RevivalProb;
  reasons: string[];
}

type LeadInput = Pick<
  Lead,
  | "leadType"
  | "source"
  | "sourceQuality"
  | "email"
  | "phone"
  | "firstName"
  | "lastName"
  | "status"
  | "lastEngagedAt"
  | "lastContactedAt"
  | "createdAt"
>;

export function evaluateRevival(
  lead: LeadInput,
  activities: Pick<LeadActivity, "type" | "occurredAt">[] = []
): RevivalResult {
  // Never mark terminal leads dormant.
  if (TERMINAL.includes(lead.status)) {
    return {
      isDormant: false,
      probability: "none",
      reasons: [`Terminal status (${lead.status})`],
    };
  }

  const now = Date.now();

  const recentEngagement = activities.some(
    (a) =>
      ENGAGEMENT_TYPES.has(a.type) &&
      now - a.occurredAt.getTime() < THIRTY_DAYS
  );

  // If we've never contacted the lead, use createdAt as the floor —
  // a brand-new lead is not dormant just because lastContactedAt is null.
  const ageFloor = lead.lastContactedAt ?? lead.lastEngagedAt ?? lead.createdAt;
  const ageMs = now - ageFloor.getTime();

  const isDormant = !recentEngagement && ageMs > THIRTY_DAYS;
  if (!isDormant) {
    return {
      isDormant: false,
      probability: "none",
      reasons: ["Active within the last 30 days"],
    };
  }

  // ── Score probability ────────────────────────────────────────────
  const reasons: string[] = [];
  let high = 0;
  let medium = 0;

  if (lead.leadType === "seller" || lead.leadType === "investor") {
    high++;
    reasons.push("High-value lead type");
  }
  if ((lead.sourceQuality ?? 0) >= 12) {
    high++;
    reasons.push("High-quality source");
  }

  if (activities.length > 0) {
    medium++;
    reasons.push("Has prior engagement history");
  }

  const complete =
    !!lead.email && !!lead.phone && !!lead.firstName && !!lead.lastName;
  if (complete) {
    medium++;
    reasons.push("Complete contact data");
  }

  if (ageMs < TWELVE_MONTHS) {
    high++;
    reasons.push("Less than 12 months since contact");
  } else if (ageMs < TWENTY_FOUR_MONTHS) {
    medium++;
    reasons.push("12–24 months since contact");
  } else {
    reasons.push("More than 24 months since contact");
  }

  let probability: RevivalProb;
  if (high >= 2) probability = "high";
  else if (high + medium >= 2) probability = "medium";
  else probability = "low";

  return { isDormant: true, probability, reasons };
}
