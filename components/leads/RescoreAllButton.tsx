"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the scoring engine across every lead the user owns.
 * Used after the scoring rules have been updated so that previously
 * imported leads pick up the new band distribution without needing
 * to clear + re-import.
 */
export function RescoreAllButton({ leadCount }: { leadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    rescored: number;
    promotedToSeller: number;
    dormantCount: number;
  } | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/rescore-all", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Rescore failed.");
      setResult({
        rescored: data.rescored ?? 0,
        promotedToSeller: data.promotedToSeller ?? 0,
        dormantCount: data.dormantCount ?? 0,
      });
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        Rescored {result.rescored.toLocaleString()} leads
        {result.promotedToSeller > 0 &&
          ` · ${result.promotedToSeller} reclassified as sellers`}
        {result.dormantCount > 0 &&
          ` · ${result.dormantCount.toLocaleString()} marked dormant`}
        .
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        className="btn"
        onClick={run}
        disabled={busy || leadCount === 0}
      >
        {busy ? "Rescoring…" : `Rescore all ${leadCount.toLocaleString()} leads`}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "#b33" }}>{error}</span>
      )}
    </div>
  );
}
