// Missed opportunity detection — 5 deterministic rules across 3 severity tiers.
//
// Called from enrichLead() on every refresh. The result is persisted to
// the lead row so dashboard reads are a single column lookup.
//
// 7-day cooldown: once a user clicks "Mark as handled", the same lead
// will not re-trigger for 7 days even if the conditions still match.

import type {
  Lead,
  LeadActivity,
  MissedOpportunityKind,
  MissedOpportunitySeverity,
  SequenceEnrollment,
} from "@prisma/client";

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;
const COOLDOWN_MS = 7 * DAY;

const TERMINAL_STATUSES = new Set([
  "unsubscribed",
  "bounced",
  "active_client",
  "archived",
  "replied",
  "engaged",
]);

const ENGAGEMENT_TYPES = new Set([
  "email_open",
  "email_click",
  "email_reply",
]);

export interface MissedOpportunityResult {
  severity: MissedOpportunitySeverity;
  kind: MissedOpportunityKind;
  reason: string;
  since: Date;
}

type LeadInput = Pick<
  Lead,
  | "createdAt"
  | "lastContactedAt"
  | "lastEngagedAt"
  | "scoreBand"
  | "status"
  | "missedOpportunityHandledAt"
>;

function formatDuration(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / (1000 * 60)))}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days < 2 && hours > 0) return `${days}d ${hours}h`;
  return `${days} days`;
}

export function detectMissedOpportunity(
  lead: LeadInput,
  activities: Pick<LeadActivity, "type" | "occurredAt">[] = [],
  enrollment: Pick<SequenceEnrollment, "status" | "currentStep"> | null = null,
  now = Date.now()
): MissedOpportunityResult | null {
  // Cooldown — recently handled, don't re-fire for 7 days.
  if (lead.missedOpportunityHandledAt) {
    const handledAge = now - lead.missedOpportunityHandledAt.getTime();
    if (handledAge < COOLDOWN_MS) return null;
  }

  // Terminal-ish states never get flagged as missed.
  if (TERMINAL_STATUSES.has(lead.status)) return null;

  const lastTouch =
    Math.max(
      lead.lastContactedAt?.getTime() ?? 0,
      lead.lastEngagedAt?.getTime() ?? 0
    ) || lead.createdAt.getTime();
  const silenceMs = now - lastTouch;
  const silenceLabel = formatDuration(silenceMs);
  const lastTouchDate = new Date(lastTouch);

  // ── Rule 1: hot, never contacted, 48h+ ──────────────────────────
  if (
    lead.scoreBand === "hot" &&
    !lead.lastContactedAt &&
    silenceMs > 48 * HOUR
  ) {
    return {
      severity: "critical",
      kind: "hot_no_contact",
      reason: `Hot lead sat untouched for ${silenceLabel}`,
      since: lastTouchDate,
    };
  }

  // ── Rule 2: hot, contact stale 48h+ ─────────────────────────────
  if (lead.scoreBand === "hot" && silenceMs > 48 * HOUR) {
    return {
      severity: "high",
      kind: "hot_stale",
      reason: `Hot lead — last contact ${silenceLabel} ago`,
      since: lastTouchDate,
    };
  }

  // ── Rule 3: click without follow-up ─────────────────────────────
  const clickActivities = activities
    .filter((a) => a.type === "email_click")
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const lastClick = clickActivities[0];
  if (lastClick) {
    const clickAtMs = lastClick.occurredAt.getTime();
    const sentAfterClick = activities.some(
      (a) => a.type === "email_sent" && a.occurredAt.getTime() > clickAtMs
    );
    const replyAfterClick = activities.some(
      (a) => a.type === "email_reply" && a.occurredAt.getTime() > clickAtMs
    );
    const clickAgeMs = now - clickAtMs;
    if (!sentAfterClick && !replyAfterClick && clickAgeMs > 48 * HOUR) {
      return {
        severity: "high",
        kind: "click_no_followup",
        reason: `Lead clicked your email but received no follow-up in ${formatDuration(clickAgeMs)}`,
        since: lastClick.occurredAt,
      };
    }
  }

  // ── Rule 4: warm + multiple opens, no outreach ──────────────────
  const fourteenDaysAgo = now - 14 * DAY;
  const recentOpens = activities.filter(
    (a) =>
      a.type === "email_open" && a.occurredAt.getTime() >= fourteenDaysAgo
  );
  if (
    lead.scoreBand === "warm" &&
    recentOpens.length >= 3 &&
    !lead.lastContactedAt
  ) {
    return {
      severity: "medium",
      kind: "warm_repeated_opens",
      reason: `Warm lead opened your email ${recentOpens.length} times — no outreach`,
      since: recentOpens[recentOpens.length - 1].occurredAt,
    };
  }

  // ── Rule 5: sequence stalled mid-cadence ────────────────────────
  if (enrollment && enrollment.status === "active" && enrollment.currentStep >= 3) {
    const recentSends = activities
      .filter((a) => a.type === "email_sent")
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 2);
    if (recentSends.length >= 2) {
      const cutoff = recentSends[recentSends.length - 1].occurredAt.getTime();
      const recentEngagement = activities.some(
        (a) =>
          ENGAGEMENT_TYPES.has(a.type) &&
          a.occurredAt.getTime() > cutoff
      );
      if (!recentEngagement) {
        return {
          severity: "medium",
          kind: "sequence_stalled",
          reason: `${enrollment.currentStep} sequence steps in, no opens or clicks`,
          since: recentSends[0].occurredAt,
        };
      }
    }
  }

  return null;
}
