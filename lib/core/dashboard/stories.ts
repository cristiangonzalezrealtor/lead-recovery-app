// Per-lead revival story generator.
// Pure string assembly from existing data — no AI.

import { prisma } from "@/lib/db";
import type { Lead, LeadActivity } from "@prisma/client";

const DAY = 1000 * 60 * 60 * 24;
const WEEK = 7 * DAY;

export interface RevivalStory {
  leadId: string;
  name: string;
  headline: string;     // "Sarah Chen replied for the first time in 142 days."
  detail: string | null; // "Wants to talk about a rental."
}

const ENGAGEMENT_TYPES = new Set([
  "email_reply",
  "email_click",
  "email_open",
]);

function pickStoryActivity(activities: LeadActivity[]): LeadActivity | null {
  // Prefer reply > click > open
  return (
    activities.find((a) => a.type === "email_reply") ??
    activities.find((a) => a.type === "email_click") ??
    activities.find((a) => a.type === "email_open") ??
    null
  );
}

function generateHeadline(
  lead: Lead,
  activity: LeadActivity | null,
  daysInactive: number
): string {
  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    lead.email ||
    "One of your leads";

  if (activity?.type === "email_reply") {
    return `${name} replied for the first time in ${daysInactive} days.`;
  }
  if (activity?.type === "email_click") {
    return `${name} clicked your revival email after ${daysInactive} days.`;
  }
  if (activity?.type === "email_open") {
    return `${name} came back after ${daysInactive} days of inactivity.`;
  }
  return `${name} came back after ${daysInactive} days.`;
}

function generateDetail(
  lead: Lead,
  activity: LeadActivity | null
): string | null {
  if (activity?.type === "email_reply") {
    const payload = activity.payload as { snippet?: string } | null;
    if (payload?.snippet) {
      const snippet = payload.snippet.trim().slice(0, 80);
      return snippet.length > 0
        ? `"${snippet}${payload.snippet.length > 80 ? "…" : ""}"`
        : null;
    }
    if (lead.intentSignal) {
      return `Wants to talk about ${lead.leadType === "rental" ? "a rental" : lead.leadType}.`;
    }
  }
  if (activity?.type === "email_click") {
    return "Clicked through your revival email.";
  }
  if (activity?.type === "email_open" && lead.intentSignal) {
    return `Originally interested in ${lead.intentSignal.slice(0, 60)}${lead.intentSignal.length > 60 ? "…" : ""}.`;
  }
  return null;
}

export async function getRevivalStories(
  userId: string,
  limit = 2
): Promise<RevivalStory[]> {
  const cutoff = new Date(Date.now() - WEEK);

  const leads = await prisma.lead.findMany({
    where: { userId, revivedAt: { gte: cutoff } },
    orderBy: { revivedAt: "desc" },
    take: 10,
    include: {
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 30,
      },
    },
  });

  const stories: RevivalStory[] = [];
  for (const lead of leads) {
    if (!lead.revivedAt) continue;

    const referenceDate =
      lead.lastContactedAt ?? lead.createdAt;
    const daysInactive = Math.max(
      1,
      Math.floor((lead.revivedAt.getTime() - referenceDate.getTime()) / DAY)
    );

    const recentEngagement = lead.activities.filter(
      (a) =>
        ENGAGEMENT_TYPES.has(a.type) &&
        a.occurredAt.getTime() >= cutoff.getTime()
    );
    const story = pickStoryActivity(recentEngagement);

    stories.push({
      leadId: lead.id,
      name:
        [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
        lead.email ||
        "Lead",
      headline: generateHeadline(lead, story, daysInactive),
      detail: generateDetail(lead, story),
    });

    if (stories.length >= limit) break;
  }

  return stories;
}
