// Deterministic rules-based scoring engine.
// Max 100, 6 categories. Every point is traceable — the return value
// includes a `factors[]` array that is persisted to `lead_score_factors`.
//
// The UI NEVER recomputes the score; it reads from the persisted factors.

import type { Lead, LeadActivity } from "@prisma/client";

export type ScoreBand = "hot" | "warm" | "nurture" | "low";

export interface ScoreFactor {
  key: string;
  label: string;
  points: number;
}

export interface ScoreResult {
  total: number;
  band: ScoreBand;
  factors: ScoreFactor[];
}

export interface ScoringInput {
  lead: Pick<
    Lead,
    | "leadType"
    | "intentSignal"
    | "timeframeDays"
    | "source"
    | "sourceQuality"
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "tags"
  >;
  recentActivities?: Pick<LeadActivity, "type" | "occurredAt">[];
}

// ── Source quality map (0–15) ────────────────────────────────────────
const SOURCE_QUALITY: Record<string, number> = {
  referral: 15,
  website: 12,
  zillow: 11,
  realtor: 10,
  facebook: 8,
  google: 9,
  open_house: 10,
  cold_list: 4,
  unknown: 2,
};

function sourcePoints(source?: string | null): number {
  if (!source) return 2;
  const key = source.toLowerCase().replace(/[^a-z]/g, "_");
  return SOURCE_QUALITY[key] ?? 5;
}

// ── Intent (0–25) ────────────────────────────────────────────────────
function intentPoints(input: ScoringInput["lead"]): ScoreFactor | null {
  const type = input.leadType;
  const signal = (input.intentSignal ?? "").toLowerCase();
  const tags = input.tags ?? [];

  let pts = 0;
  let label = "";

  if (type === "seller") {
    pts = 22;
    label = "Seller intent detected";
  } else if (type === "investor") {
    pts = 20;
    label = "Investor intent detected";
  } else if (type === "buyer") {
    pts = 16;
    label = "Buyer intent detected";
  } else if (type === "valuation") {
    pts = 18;
    label = "Home valuation request";
  } else if (type === "rental") {
    pts = 10;
    label = "Rental intent detected";
  } else {
    pts = 4;
    label = "Unclassified intent";
  }

  if (/ready|urgent|asap|motivated/.test(signal)) pts = Math.min(25, pts + 3);
  if (tags.includes("cash_buyer")) pts = Math.min(25, pts + 2);

  return { key: "intent", label, points: pts };
}

// ── Timeframe (0–20) ─────────────────────────────────────────────────
function timeframePoints(days?: number | null): ScoreFactor | null {
  if (days == null) {
    return { key: "timeframe", label: "No timeframe provided", points: 4 };
  }
  if (days <= 30)
    return { key: "timeframe", label: "Timeframe within 30 days", points: 20 };
  if (days <= 90)
    return { key: "timeframe", label: "Timeframe within 90 days", points: 14 };
  if (days <= 180)
    return { key: "timeframe", label: "Timeframe within 6 months", points: 9 };
  return { key: "timeframe", label: "Timeframe 6+ months", points: 4 };
}

// ── Engagement (0–20) ────────────────────────────────────────────────
function engagementPoints(
  activities: ScoringInput["recentActivities"] = []
): ScoreFactor {
  const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
  const cutoff = Date.now() - THIRTY_DAYS;
  const recent = activities.filter((a) => a.occurredAt.getTime() >= cutoff);

  let pts = 0;
  const hasReply = recent.some((a) => a.type === "email_reply");
  const clicks = recent.filter((a) => a.type === "email_click").length;
  const opens = recent.filter((a) => a.type === "email_open").length;

  if (hasReply) pts += 14;
  pts += Math.min(4, clicks * 2);
  pts += Math.min(4, opens);
  pts = Math.min(20, pts);

  const label = hasReply
    ? "Replied recently"
    : clicks > 0
    ? "Clicked recent email"
    : opens > 0
    ? "Opened recent email"
    : "No recent engagement";

  return { key: "engagement", label, points: pts };
}

// ── Source quality (0–15) ────────────────────────────────────────────
function sourceFactor(input: ScoringInput["lead"]): ScoreFactor {
  const explicit = input.sourceQuality ?? 0;
  const derived = sourcePoints(input.source);
  const pts = Math.max(explicit, derived);
  return {
    key: "source",
    label: input.source ? `${input.source} source` : "Unknown source",
    points: Math.min(15, pts),
  };
}

// ── Data completeness (0–10) ─────────────────────────────────────────
function completenessFactor(input: ScoringInput["lead"]): ScoreFactor {
  let pts = 0;
  if (input.email) pts += 3;
  if (input.phone) pts += 3;
  if (input.firstName && input.lastName) pts += 2;
  if ((input.tags ?? []).length > 0) pts += 2;
  pts = Math.min(10, pts);
  return {
    key: "completeness",
    label:
      pts >= 8 ? "Complete contact info" : pts >= 5 ? "Partial contact info" : "Sparse contact info",
    points: pts,
  };
}

// ── Fit / opportunity (0–10) ─────────────────────────────────────────
function fitFactor(input: ScoringInput["lead"]): ScoreFactor {
  const tags = new Set(input.tags ?? []);
  let pts = 0;
  if (tags.has("luxury")) pts += 4;
  if (tags.has("cash_buyer")) pts += 3;
  if (tags.has("absentee_owner")) pts += 3;
  if (tags.has("relocation")) pts += 2;
  if (tags.has("downsizing")) pts += 2;
  pts = Math.min(10, pts);
  return {
    key: "fit",
    label: pts > 0 ? "High-fit opportunity signals" : "No special fit signals",
    points: pts,
  };
}

// ── Banding ──────────────────────────────────────────────────────────
export function bandOf(total: number): ScoreBand {
  if (total >= 85) return "hot";
  if (total >= 65) return "warm";
  if (total >= 40) return "nurture";
  return "low";
}

// ── Public API ───────────────────────────────────────────────────────
export function scoreLead(input: ScoringInput): ScoreResult {
  const factors: ScoreFactor[] = [];
  const intent = intentPoints(input.lead);
  if (intent) factors.push(intent);
  const tf = timeframePoints(input.lead.timeframeDays);
  if (tf) factors.push(tf);
  factors.push(engagementPoints(input.recentActivities));
  factors.push(sourceFactor(input.lead));
  factors.push(completenessFactor(input.lead));
  factors.push(fitFactor(input.lead));

  const total = Math.min(
    100,
    factors.reduce((s, f) => s + f.points, 0)
  );
  return { total, band: bandOf(total), factors };
}
