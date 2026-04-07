"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Destructive action: wipes every lead for the current user.
 * Two-step confirmation — click, then type the phrase, then submit.
 */
export function ClearLeadsButton({ leadCount }: { leadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const REQUIRED = "DELETE ALL LEADS";
  const phraseOk = phrase === REQUIRED;

  async function submit() {
    if (!phraseOk) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: REQUIRED }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      const data = await res.json();
      setResult(data.deletedLeads ?? 0);
      setPhrase("");
      // Refresh the page so the dashboard / leads counts reset.
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (result !== null) {
    return (
      <div
        style={{
          padding: 12,
          border: "1px solid var(--ok, #2e7d32)",
          borderRadius: 6,
          background: "rgba(46, 125, 50, 0.06)",
        }}
      >
        <strong>{result.toLocaleString()} leads deleted.</strong>
        <div
          style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 13 }}
        >
          Your imports, sequences, and checklist have also been reset. Upload a
          new CSV to start over.
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn"
        onClick={() => setOpen(true)}
        disabled={leadCount === 0}
        style={{
          borderColor: "#b33",
          color: leadCount === 0 ? "var(--ink-mute)" : "#b33",
        }}
      >
        {leadCount === 0
          ? "No leads to clear"
          : `Clear all ${leadCount.toLocaleString()} leads`}
      </button>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #b33",
        borderRadius: 6,
        background: "rgba(179, 51, 51, 0.04)",
      }}
    >
      <div style={{ fontWeight: 600, color: "#b33", marginBottom: 4 }}>
        This will permanently delete {leadCount.toLocaleString()} leads.
      </div>
      <div
        style={{
          color: "var(--ink-soft)",
          fontSize: 13,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        Every lead, every activity, every sequence enrollment, and your import
        history will be wiped. Your account, brand profile, and sequence
        templates stay intact. This cannot be undone.
      </div>

      <label
        style={{
          display: "block",
          fontSize: 13,
          marginBottom: 6,
          color: "var(--ink-soft)",
        }}
      >
        Type <code>{REQUIRED}</code> to confirm:
      </label>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={REQUIRED}
        disabled={busy}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--line)",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 14,
          marginBottom: 12,
        }}
      />

      {error && (
        <div
          style={{
            color: "#b33",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setOpen(false);
            setPhrase("");
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          onClick={submit}
          disabled={!phraseOk || busy}
          style={{
            background: phraseOk && !busy ? "#b33" : undefined,
            color: phraseOk && !busy ? "white" : undefined,
            borderColor: "#b33",
          }}
        >
          {busy ? "Deleting…" : "Yes, delete everything"}
        </button>
      </div>
    </div>
  );
}
