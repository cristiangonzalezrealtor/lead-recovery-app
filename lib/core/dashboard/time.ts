// Standardized relative time helpers used everywhere on the dashboard.
// Keeps the visual language consistent: "12m ago", "3h ago", "2d ago".

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function timeAgo(date: Date | null | undefined, now = Date.now()): string {
  if (!date) return "—";
  const diff = now - date.getTime();
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  const months = Math.floor(diff / (30 * DAY));
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function durationOf(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MIN))}m`;
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    return `${hours}h`;
  }
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days < 2 && hours > 0) return `${days}d ${hours}h`;
  return `${days} days`;
}

/**
 * Standardized urgency phrase for a lead's contact state.
 * Used in Top 5 row sub-headlines and elsewhere.
 */
export function urgencyPhrase(lead: {
  status: string;
  lastEngagedAt: Date | null;
  lastContactedAt: Date | null;
  createdAt: Date;
}): string {
  const now = Date.now();

  if (lead.status === "replied" && lead.lastEngagedAt) {
    return `Replied ${timeAgo(lead.lastEngagedAt, now)}`;
  }
  if (lead.status === "engaged" && lead.lastEngagedAt) {
    return `Engaged ${timeAgo(lead.lastEngagedAt, now)}`;
  }
  if (lead.lastContactedAt) {
    return `No contact in ${durationOf(now - lead.lastContactedAt.getTime())}`;
  }
  if (lead.lastEngagedAt) {
    return `Last activity ${timeAgo(lead.lastEngagedAt, now)}`;
  }
  return "No outreach attempted yet";
}
