"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SequenceOption {
  id: string;
  name: string;
  tone: string;
}

export function BulkReviveButton({
  sequences,
}: {
  sequences: SequenceOption[];
}) {
  const router = useRouter();
  const [sequenceId, setSequenceId] = useState("");
  const [probability, setProbability] = useState<"high" | "medium" | "low" | "all">("high");
  const [maxLeads, setMaxLeads] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!sequenceId) return;
    setError(null);
    setResult(null);
    setLoading(true);
    const res = await fetch("/api/revival/bulk-enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sequenceId,
        probability: probability === "all" ? undefined : probability,
        maxLeads,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Bulk enroll failed");
      return;
    }
    const data = await res.json();
    setResult(
      `Enrolled ${data.enrolled} · skipped ${data.skipped} · total matched ${data.total}`
    );
    router.refresh();
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr auto",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <label>Sequence</label>
          <select value={sequenceId} onChange={(e) => setSequenceId(e.target.value)}>
            <option value="">Choose a dormant sequence…</option>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.tone})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Probability</label>
          <select
            value={probability}
            onChange={(e) => setProbability(e.target.value as typeof probability)}
          >
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
            <option value="all">All probabilities</option>
          </select>
        </div>
        <div>
          <label>Max leads</label>
          <input
            type="number"
            min={1}
            max={500}
            value={maxLeads}
            onChange={(e) => setMaxLeads(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <button
          className="btn primary"
          onClick={onSubmit}
          disabled={loading || !sequenceId}
        >
          {loading ? "Enrolling…" : "Start campaign"}
        </button>
      </div>
      {result && (
        <div className="alert info" style={{ marginTop: 12 }}>
          {result}
        </div>
      )}
      {error && (
        <div className="alert error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
