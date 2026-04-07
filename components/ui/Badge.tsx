import type { ScoreBand } from "@prisma/client";

export function ScoreBadge({ band }: { band: ScoreBand }) {
  const label =
    band === "hot" ? "Hot" :
    band === "warm" ? "Warm" :
    band === "nurture" ? "Nurture" : "Low";
  return <span className={`badge ${band}`}>{label}</span>;
}
