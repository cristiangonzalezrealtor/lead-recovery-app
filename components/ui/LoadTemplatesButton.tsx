"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-click loader for the 18 built-in sequence templates. Shown on the
 * Sequences page when the library is empty. Idempotent — calling it again
 * is a no-op.
 */
export function LoadTemplatesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    created: number;
    total: number;
  } | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seed-sequences", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load templates.");
      }
      const data = await res.json();
      setDone({ created: data.created, total: data.total });
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          padding: 12,
          border: "1px solid #2e7d32",
          borderRadius: 6,
          background: "rgba(46, 125, 50, 0.06)",
        }}
      >
        <strong>
          {done.created === 0
            ? `All ${done.total} templates were already loaded.`
            : `Loaded ${done.created} of ${done.total} sequence templates.`}
        </strong>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="btn primary"
        onClick={load}
        disabled={busy}
      >
        {busy ? "Loading…" : "Load 18 built-in sequence templates"}
      </button>
      {error && (
        <div style={{ color: "#b33", fontSize: 13, marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
