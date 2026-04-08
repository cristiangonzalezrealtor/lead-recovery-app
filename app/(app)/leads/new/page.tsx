"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TYPES = [
  "buyer",
  "seller",
  "investor",
  "rental",
  "valuation",
  "dormant",
] as const;

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    leadType: "buyer" as (typeof TYPES)[number],
    source: "",
    intentSignal: "",
    timeframeDays: "",
    markAsDormant: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          timeframeDays: form.timeframeDays ? Number(form.timeframeDays) : undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          source: form.source || undefined,
          intentSignal: form.intentSignal || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add lead.");
      }
      router.push(`/leads/${data.leadId}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/leads" className="btn ghost">
            ← Leads
          </Link>
          <h1 style={{ margin: 0 }}>Add a lead</h1>
        </div>
        <p>Manually add one lead. For bigger lists, use a CSV import.</p>
      </div>

      <form onSubmit={submit} className="card" style={{ maxWidth: 640 }}>
        <h2>Contact</h2>
        <div className="subtitle">Email or phone is required.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="First name">
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={busy}
              placeholder="jane@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              disabled={busy}
              placeholder="555-123-4567"
            />
          </Field>
        </div>

        <h2 style={{ marginTop: 24 }}>Classification</h2>
        <div className="subtitle">How LeadRevive should treat this lead.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="Lead type">
            <select
              value={form.leadType}
              onChange={(e) => update("leadType", e.target.value as (typeof TYPES)[number])}
              disabled={busy}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <input
              type="text"
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              disabled={busy}
              placeholder="Zillow, Open House, Referral…"
            />
          </Field>
          <Field label="Timeframe (days)">
            <input
              type="number"
              min={0}
              value={form.timeframeDays}
              onChange={(e) => update("timeframeDays", e.target.value)}
              disabled={busy}
              placeholder="e.g. 30"
            />
          </Field>
          <div />
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Notes / intent signal">
            <textarea
              value={form.intentSignal}
              onChange={(e) => update("intentSignal", e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="Anything you know about what they want."
            />
          </Field>
        </div>

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 16,
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          <input
            type="checkbox"
            checked={form.markAsDormant}
            onChange={(e) => update("markAsDormant", e.target.checked)}
            disabled={busy}
          />
          Mark as dormant (old lead I want to revive)
        </label>

        {error && (
          <div className="alert error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Link href="/leads" className="btn ghost">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || (!form.email && !form.phone)}
          >
            {busy ? "Adding…" : "Add lead"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-soft)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: "100%",
        }}
      >
        {children}
      </div>
      <style jsx>{`
        input,
        select,
        textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--line, #d4d4d4);
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          background: white;
        }
        input:disabled,
        select:disabled,
        textarea:disabled {
          background: #f5f5f4;
          color: #888;
        }
      `}</style>
    </label>
  );
}
