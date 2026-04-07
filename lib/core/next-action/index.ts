// NextActionService — decides what the agent should do next for a lead.
//
// Phase 1.6 additions:
//   • Returns a `reason` string alongside the action
//   • Time-based urgency escalation (bump priority on staleness)
//   • Missed-opportunity detection (hot + 48h quiet → recovery)
//   • Sequence awareness (later steps + no engagement → different action)

import type { Lead, SequenceEnrollment } from "@prisma/client";

export type NextActionPriority = "high" | "medium" | "low";

export interface NextAction {
  action: string;
  reason: string;
  priority: NextActionPriority;
}

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

const MISSED_OPPORTUNITY_WINDOW_MS = 48 * HOUR;
const STALE_WARM_WINDOW_MS = 5 * DAY;
const STALE_NURTURE_WINDOW_MS = 14 * DAY;

type LeadInput = Pick<
  Lead,
  | "leadType"
  | "scoreBand"
  | "score"
  | "status"
  | "isDormant"
  | "revivalProbability"
  | "lastEngagedAt"
  | "lastContactedAt"
  | "updatedAt"
  | "createdAt"
  | "email"
  | "phone"
>;

type EnrollmentInput = Pick<
  SequenceEnrollment,
  "status" | "currentStep" | "startedAt" | "nextSendAt"
> | null;

export interface NextActionContext {
  lead: LeadInput;
  enrollment?: EnrollmentInput;
  hasRecentEngagement?: boolean; // any engagement within ~14 days
}

function bump(p: NextActionPriority): NextActionPriority {
  return p === "low" ? "medium" : "high";
}

export function formatDuration(ms: number): string {
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days >= 2) return `${days} days`;
  if (days === 1) return hours > 0 ? `1 day ${hours}h` : "1 day";
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `${minutes} min`;
}

export function computeNextAction(ctx: NextActionContext): NextAction {
  const { lead, enrollment } = ctx;
  const now = Date.now();

  // Age since we last did anything with this lead.
  const lastTouchMs = Math.max(
    lead.lastContactedAt?.getTime() ?? 0,
    lead.lastEngagedAt?.getTime() ?? 0,
    lead.updatedAt?.getTime() ?? 0
  );
  const silenceMs = lastTouchMs === 0 ? now - lead.createdAt.getTime() : now - lastTouchMs;

  // ── Inbound pipeline takes precedence ───────────────────────────
  if (lead.status === "replied")
    return {
      action: "Reply now — they just responded",
      reason: "Fastest follow-up wins deals",
      priority: "high",
    };
  if (lead.status === "engaged")
    return {
      action: "Book a call — they're engaging",
      reason: "Convert momentum into a conversation",
      priority: "high",
    };
  if (lead.status === "appointment_set")
    return {
      action: "Prep for the appointment",
      reason: "Appointment is booked — get ready",
      priority: "high",
    };

  // ── Terminal states ─────────────────────────────────────────────
  if (lead.status === "unsubscribed")
    return {
      action: "No action — lead unsubscribed",
      reason: "Unsubscribes are a hard stop — respect their opt-out",
      priority: "low",
    };
  if (lead.status === "bounced")
    return {
      action: "Verify contact info — email bounced",
      reason: "Email bounced — try phone or re-collect the email address",
      priority: "low",
    };
  if (lead.status === "archived")
    return {
      action: "Archived — review later for revival",
      reason: "This lead was archived or marked dormant at import",
      priority: "low",
    };
  if (lead.status === "active_client")
    return {
      action: "Active client — CRM owns this lead",
      reason: "Already closed — hand off to your CRM for transaction tracking",
      priority: "low",
    };

  // ── Missed opportunity: hot lead, no contact in 48h ────────────
  // Detection of the missed opportunity flag itself lives in
  // lib/core/missed-opportunity. NextActionService still produces a
  // high-priority action so the dashboard surfaces it, but the
  // missedOpportunity persistence happens in enrichLead().
  if (lead.scoreBand === "hot" && silenceMs > MISSED_OPPORTUNITY_WINDOW_MS) {
    return {
      action: `Call now — silent for ${formatDuration(silenceMs)}`,
      reason: "Hot leads go cold fast",
      priority: "high",
    };
  }

  // ── Sequence-aware: later steps with no engagement ─────────────
  if (enrollment && enrollment.status === "active" && enrollment.currentStep >= 3) {
    if (!ctx.hasRecentEngagement) {
      return {
        action: "Switch approach — sequence is losing them",
        reason: `${enrollment.currentStep} steps in, no opens or clicks`,
        priority: "medium",
      };
    }
  }

  // ── Dormant revival path ────────────────────────────────────────
  if (lead.isDormant) {
    if (lead.revivalProbability === "high")
      return {
        action: "Start revival — strong signals",
        reason: "Multiple revival signals — ideal candidate",
        priority: "high",
      };
    if (lead.revivalProbability === "medium")
      return {
        action: "Send a curiosity revival email",
        reason: "Worth one low-cost touch to test interest",
        priority: "medium",
      };
    return {
      action: "Dormant — low priority",
      reason: "Few revival signals",
      priority: "low",
    };
  }

  // ── Hot untouched ───────────────────────────────────────────────
  if (lead.scoreBand === "hot" && !lead.lastContactedAt)
    return {
      action: "Call now — hot lead, no contact yet",
      reason: "Highest band, no outreach attempted",
      priority: "high",
    };

  if (lead.scoreBand === "hot")
    return {
      action: "Follow up — hot lead",
      reason: "Keep the conversation warm",
      priority: "high",
    };

  // ── Warm ────────────────────────────────────────────────────────
  if (lead.scoreBand === "warm") {
    const stale = silenceMs > STALE_WARM_WINDOW_MS;
    const priority: NextActionPriority = stale ? "high" : "medium";
    if (lead.lastEngagedAt) {
      return {
        action: "Reach out — engagement is rising",
        reason: stale
          ? "Quiet for 5+ days — act before momentum fades"
          : "Recent opens indicate rising interest",
        priority,
      };
    }
    return {
      action: "Add to a nurture sequence",
      reason: stale
        ? "Warm but quiet — enroll before they cool"
        : "Warm and unassigned — start nurturing",
      priority,
    };
  }

  // ── Nurture band ────────────────────────────────────────────────
  if (lead.scoreBand === "nurture") {
    const stale = silenceMs > STALE_NURTURE_WINDOW_MS;
    return {
      action: "Enroll in slow-drip nurture",
      reason: stale
        ? "14+ days of silence — needs a re-engage"
        : "Slow, consistent touch cadence",
      priority: stale ? "medium" : "low",
    };
  }

  // ── Low band ────────────────────────────────────────────────────
  if (!lead.email && !lead.phone)
    return {
      action: "Enrich contact info",
      reason: "No email or phone on file",
      priority: "medium",
    };

  return {
    action: "Monitor — low priority",
    reason: "No special signals yet",
    priority: "low",
  };
}
