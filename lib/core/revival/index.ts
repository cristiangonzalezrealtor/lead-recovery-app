// RevivalService — detects dormant leads and scores revival probability.
//
// Dormant criteria (either path makes a lead dormant):
//
//   Path A — "went cold": previously engaged, now silent
//     • no engagement event in 30+ days AND
//     • ageMs (last-contacted / last-engaged / createdAt) > 30 days AND
//     • not in a terminal status
//
//   Path B — "cold prospecting list": imported but never warmed up
//     • zero inbound engagement ever AND
//     • never contacted (lastContactedAt is null) AND
//     • comes from a prospecting source (expired_listing tag, vortex /
//       expired / redx / fsbo source, or source name containing those)
//
//   Neither path applies to terminal statuses (unsubscribed, bounced,
//   active_client, archived).
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
  | "tags"
>;

/**
 * A lead is "cold prospecting" if it came off a list we bought or scraped
 * rather than from inbound engagement. These leads are dormant the moment
 * they land — the whole reason to import them is to run revival on them.
 */
function isColdProspecting(lead: LeadInput): boolean {
  const tags = lead.tags ?? [];
  if (
    tags.includes("expired_listing") ||
    tags.includes("cold_list") ||
    tags.includes("fsbo")
  ) {
    return true;
  }
  const source = (lead.source ?? "").toLowerCase();
  return /vortex|expired|withdrawn|redx|landvoice|fsbo|cold list/.test(source);
}

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
  const everEngaged = activities.some((a) => ENGAGEMENT_TYPES.has(a.type));

  // Path A — previously active, now silent.
  const ageFloor = lead.lastContactedAt ?? lead.lastEngagedAt ?? lead.createdAt;
  const ageMs = now - ageFloor.getTime();
  const wentCold = !recentEngagement && ageMs > THIRTY_DAYS;

  // Path B — cold prospecting list (expired listings, FSBO, etc.) that
  // has never been contacted and never engaged. Dormant the moment it
  // lands because revival outreach IS the workflow for this pool.
  const coldProspectingDormant =
    isColdProspecting(lead) && !everEngaged && lead.lastContactedAt == null;

  const isDormant = wentCold || coldProspectingDormant;
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

  if (coldProspectingDormant) {
    reasons.push("Cold prospecting list — never contacted");
    // Expired listings specifically are motivated sellers.
    if ((lead.tags ?? []).includes("expired_listing")) {
      high++;
      reasons.push("Expired listing — motivated seller");
    }
  }

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
