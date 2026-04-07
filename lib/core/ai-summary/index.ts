// Rule-based AI summary generator.
// Phase 1 uses deterministic text assembly — no external LLM.
// Swap the body of this function for a real LLM call in Phase 2.

import type { Lead } from "@prisma/client";

type Input = Pick<
  Lead,
  | "firstName"
  | "lastName"
  | "leadType"
  | "source"
  | "timeframeDays"
  | "intentSignal"
  | "tags"
  | "score"
  | "scoreBand"
  | "isDormant"
  | "revivalProbability"
>;

const TYPE_LABELS: Record<string, string> = {
  seller: "home seller",
  buyer: "home buyer",
  investor: "investor",
  rental: "rental prospect",
  valuation: "home valuation request",
  dormant: "dormant lead",
};

export function generateAiSummary(lead: Input): string {
  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "This lead";
  const typeLabel = TYPE_LABELS[lead.leadType] ?? lead.leadType;

  // Sentence 1 — identity
  const s1Parts: string[] = [`${name} is a ${typeLabel}`];
  if (lead.source) s1Parts.push(`from ${lead.source}`);
  if (lead.timeframeDays != null) {
    if (lead.timeframeDays <= 30) s1Parts.push("with a 30-day timeframe");
    else if (lead.timeframeDays <= 90) s1Parts.push("with a 90-day timeframe");
    else if (lead.timeframeDays <= 180) s1Parts.push("with a 6-month timeframe");
    else s1Parts.push("with a long timeframe");
  }
  const s1 = s1Parts.join(" ") + ".";

  // Sentence 2 — score + tags + dormant
  const s2Parts: string[] = [`Scored ${lead.score} (${lead.scoreBand})`];
  if (lead.tags?.length) s2Parts.push(`tagged ${lead.tags.join(", ")}`);
  if (lead.isDormant && lead.revivalProbability !== "none")
    s2Parts.push(`currently dormant with ${lead.revivalProbability} revival probability`);
  const s2 = s2Parts.join(", ") + ".";

  // Sentence 3 — intent signal (optional, trimmed)
  let s3 = "";
  if (lead.intentSignal) {
    const trimmed = lead.intentSignal.trim().slice(0, 140);
    const ellipsis = lead.intentSignal.length > 140 ? "…" : "";
    s3 = ` Note: "${trimmed}${ellipsis}"`;
  }

  return `${s1} ${s2}${s3}`;
}
