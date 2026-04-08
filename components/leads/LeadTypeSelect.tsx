"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  "seller",
  "buyer",
  "investor",
  "rental",
  "valuation",
  "dormant",
] as const;

type LeadType = (typeof TYPES)[number];

/**
 * Inline lead-type editor for the lead detail Summary card.
 * Click to edit → pick from dropdown → saves immediately and refreshes
 * the page so the Enroll dropdown picks up the new type's sequences.
 */
export function LeadTypeSelect({
  leadId,
  currentType,
}: {
  leadId: string;
  currentType: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<LeadType>(currentType as LeadType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: LeadType) {
    if (next === currentType) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadType: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update.");
      }
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setValue(currentType as LeadType);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <span>{currentType}</span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setEditing(true)}
          style={{ padding: "2px 8px", fontSize: 11 }}
        >
          change
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value as LeadType;
          setValue(next);
          save(next);
        }}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--line)",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 13,
        }}
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          setEditing(false);
          setValue(currentType as LeadType);
          setError(null);
        }}
        disabled={busy}
        style={{ padding: "2px 8px", fontSize: 11 }}
      >
        cancel
      </button>
      {busy && (
        <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>saving…</span>
      )}
      {error && (
        <span style={{ fontSize: 11, color: "#b33" }}>{error}</span>
      )}
    </span>
  );
}
