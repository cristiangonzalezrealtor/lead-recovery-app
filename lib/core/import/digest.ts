// Post-import digest — the data backing the Results ("Wow") screen.
//
// Computed once at commit time and cached on Import.digest. The results
// page reads the cached snapshot so refreshes stay fast.
//
// Refinement #1 additions:
//   • "ready now" / "30+ days inactive" context per metric
//   • best opportunity lead (highest-priority single lead)

import { prisma } from "@/lib/db";
import type { Lead } from "@prisma/client";

export interface DigestMetric {
  count: number;
  label: string;
  context: string;
  href: string;
}

export interface BestOpportunityLead {
  id: string;
  name: string;
  leadType: string;
  score: number;
  band: string;
  confidence: string | null;
  headline: string;
  why: string;
  status: string;
}

export interface StartHereAction {
  kind: "hot_lead" | "dormant_revival" | "nurture_assign" | "empty_fallback";
  title: string;
  subtitle: string;
  whyItMatters: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface PostImportDigest {
  importId: string;
  filename: string;
  totalImported: number;
  computedAt: string; // ISO
  metrics: {
    hotLeads: DigestMetric;
    reviveWorthyDormant: DigestMetric;
    missedOpportunities: DigestMetric;
    readyToNurture: DigestMetric;
  };
  missingContactInfoCount: number;
  rejectedCount: number;
  bestOpportunity: BestOpportunityLead | null;
  startHere: StartHereAction[];
}

export async function computePostImportDigest(
  userId: string,
  importId: string
): Promise<PostImportDigest> {
  const importRow = await prisma.import.findFirst({
    where: { id: importId, userId },
  });
  if (!importRow) throw new Error("Import not found");

  // All leads from this import (regardless of current state).
  const leads = await prisma.lead.findMany({
    where: { userId, importedFromId: importId },
    orderBy: { score: "desc" },
  });

  const hot = leads.filter((l) => l.scoreBand === "hot");
  const reviveWorthy = leads.filter(
    (l) =>
      l.isDormant &&
      (l.revivalProbability === "high" || l.revivalProbability === "medium")
  );
  const missedOpportunities = leads.filter((l) => l.missedOpportunity);
  const readyToNurture = leads.filter(
    (l) =>
      (l.scoreBand === "warm" || l.scoreBand === "nurture") &&
      !l.isDormant &&
      l.status !== "unsubscribed" &&
      l.status !== "bounced" &&
      l.status !== "archived"
  );
  const missingContactInfo = leads.filter(
    (l) => !l.email || !l.phone
  );

  // ── Pick best opportunity lead ──────────────────────────────────
  const best = pickBestOpportunity(leads);

  // ── Build Start Here actions ────────────────────────────────────
  const startHere = buildStartHere({
    hot,
    reviveWorthy,
    readyToNurture,
  });

  const digest: PostImportDigest = {
    importId: importRow.id,
    filename: importRow.filename,
    totalImported: leads.length,
    computedAt: new Date().toISOString(),
    metrics: {
      hotLeads: {
        count: hot.length,
        label: "Hot leads found",
        context: "Ready to contact now",
        href: "/leads?band=hot",
      },
      reviveWorthyDormant: {
        count: reviveWorthy.length,
        label: "Revive-worthy dormant leads",
        context: "30+ days inactive with strong revival signals",
        href: "/revival",
      },
      missedOpportunities: {
        count: missedOpportunities.length,
        label: "Missed opportunities",
        context: "Hot leads that have gone quiet",
        href: "/leads?filter=missed-opportunities",
      },
      readyToNurture: {
        count: readyToNurture.length,
        label: "Ready to nurture",
        context: "Warm leads without a sequence yet",
        href: "/leads?filter=ready-to-nurture",
      },
    },
    missingContactInfoCount: missingContactInfo.length,
    rejectedCount: importRow.rejectedCount,
    bestOpportunity: best,
    startHere,
  };

  // Persist
  await prisma.import.update({
    where: { id: importRow.id },
    data: {
      digest: digest as unknown as object,
      digestReadyAt: new Date(),
    },
  });

  return digest;
}

// ── Helpers ──────────────────────────────────────────────────────────

function pickBestOpportunity(leads: Lead[]): BestOpportunityLead | null {
  if (leads.length === 0) return null;

  // Prefer: hot untouched → revive-worthy high → highest score
  const hotUntouched = leads.find(
    (l) => l.scoreBand === "hot" && !l.lastContactedAt
  );
  const chosen =
    hotUntouched ??
    leads.find((l) => l.isDormant && l.revivalProbability === "high") ??
    leads.find((l) => l.scoreBand === "hot") ??
    leads[0];

  if (!chosen) return null;
  if (chosen.score === 0) return null; // digest not yet populated

  const name =
    [chosen.firstName, chosen.lastName].filter(Boolean).join(" ") ||
    chosen.email ||
    "One of your new leads";

  let headline = "Your best opportunity from this import";
  let why = chosen.nextAction ?? "Open this lead to take the next step";

  if (chosen.scoreBand === "hot" && !chosen.lastContactedAt) {
    headline = `${name} is hot — and nobody has contacted them yet`;
    why =
      chosen.nextActionReason ??
      "Hot untouched leads convert fastest when you reach out first";
  } else if (chosen.isDormant && chosen.revivalProbability === "high") {
    headline = `${name} is dormant but highly revivable`;
    why =
      chosen.nextActionReason ??
      "Strong revival signals — ideal candidate for a curiosity-led email";
  } else if (chosen.scoreBand === "hot") {
    headline = `${name} is your highest-scoring lead`;
    why = chosen.nextActionReason ?? "Prioritize follow-up on this one today";
  }

  return {
    id: chosen.id,
    name,
    leadType: chosen.leadType,
    score: chosen.score,
    band: chosen.scoreBand,
    confidence: chosen.confidence,
    headline,
    why,
    status: chosen.status,
  };
}

function buildStartHere({
  hot,
  reviveWorthy,
  readyToNurture,
}: {
  hot: Lead[];
  reviveWorthy: Lead[];
  readyToNurture: Lead[];
}): StartHereAction[] {
  const out: StartHereAction[] = [];

  if (hot.length > 0) {
    const top = hot[0];
    const name =
      [top.firstName, top.lastName].filter(Boolean).join(" ") ||
      top.email ||
      "your top hot lead";
    out.push({
      kind: "hot_lead",
      title: "Contact your top hot lead",
      subtitle: `${name} — ${top.leadType}, scored ${top.score}${
        !top.lastContactedAt ? ", no outreach yet" : ""
      }`,
      whyItMatters:
        "Hot leads go cold fast. The agent who reaches them first almost always wins the deal.",
      ctaLabel: "Open lead",
      ctaHref: `/leads/${top.id}`,
    });
  }

  if (reviveWorthy.length > 0) {
    out.push({
      kind: "dormant_revival",
      title: "Start a dormant revival campaign",
      subtitle: `${reviveWorthy.length} dormant lead${
        reviveWorthy.length === 1 ? "" : "s"
      } with strong revival signals`,
      whyItMatters:
        "These leads already raised their hand once. A curiosity-led email is how deals hiding in your database come back to life.",
      ctaLabel: "Launch campaign",
      ctaHref: "/revival",
    });
  }

  if (readyToNurture.length > 0) {
    out.push({
      kind: "nurture_assign",
      title: "Enroll unassigned leads in a sequence",
      subtitle: `${readyToNurture.length} warm lead${
        readyToNurture.length === 1 ? "" : "s"
      } not in any sequence yet`,
      whyItMatters:
        "Warm leads without a sequence are the most expensive mistake in your database. Every day without a touch is momentum lost.",
      ctaLabel: "Pick a sequence",
      ctaHref: "/sequences",
    });
  }

  if (out.length === 0) {
    out.push({
      kind: "empty_fallback",
      title: "Review your leads",
      subtitle: "No urgent actions yet — let's browse what you imported",
      whyItMatters:
        "Even when nothing is on fire, knowing your database is the first step to recovering deals from it.",
      ctaLabel: "Open leads",
      ctaHref: "/leads",
    });
  }

  return out;
}
