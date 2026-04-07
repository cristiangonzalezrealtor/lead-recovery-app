"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SequenceOption {
  id: string;
  name: string;
  leadType: string;
}

interface Props {
  leadId: string;
  sequences: SequenceOption[];
  currentSequenceId?: string | null;
  currentSequenceName?: string | null;
  variant?: "default" | "compact";
}

export function EnrollButton({
  leadId,
  sequences,
  currentSequenceId,
  currentSequenceName,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [needConfirm, setNeedConfirm] = useState<{
    fromName: string;
    toId: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(confirmSwitch = false) {
    if (!selected) return;
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId: selected, confirmSwitch }),
    });
    setLoading(false);

    if (res.status === 409) {
      const data = await res.json();
      if (data.reason === "switch_requires_confirmation") {
        setNeedConfirm({
          fromName: data.currentSequenceName,
          toId: selected,
        });
        return;
      }
      setError(data.error ?? "Conflict");
      return;
    }
    if (!res.ok) {
      setError("Failed to enroll");
      return;
    }
    setOpen(false);
    setNeedConfirm(null);
    router.refresh();
  }

  async function unenroll() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unenroll: true }),
    });
    setLoading(false);
    router.refresh();
  }

  const modal = open && (
    <div className="modal-backdrop" onClick={() => !loading && setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px" }}>
          {currentSequenceId ? "Switch sequence" : "Enroll in sequence"}
        </h3>

        {needConfirm ? (
          <>
            <p style={{ margin: "0 0 14px", color: "var(--ink-soft)" }}>
              This lead is already in <strong>{needConfirm.fromName}</strong>.
              Switching will stop the current sequence and start a new one.
            </p>
            {error && <div className="alert error">{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setNeedConfirm(null)} disabled={loading}>
                Cancel
              </button>
              <button className="btn primary" onClick={() => submit(true)} disabled={loading}>
                {loading ? "Switching…" : "Confirm switch"}
              </button>
            </div>
          </>
        ) : (
          <>
            <label>Sequence</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Choose a sequence…</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.leadType})
                </option>
              ))}
            </select>
            {error && (
              <div className="alert error" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button className="btn ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => submit(false)}
                disabled={loading || !selected}
              >
                {loading ? "Enrolling…" : "Enroll"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (variant === "compact") {
    return (
      <>
        {!currentSequenceId && (
          <button
            className="icon-btn"
            onClick={() => setOpen(true)}
            disabled={loading}
            title="Assign sequence"
            aria-label="Assign sequence"
          >
            ↻
          </button>
        )}
        {modal}
      </>
    );
  }

  return (
    <>
      {currentSequenceId ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            Enrolled in <strong>{currentSequenceName}</strong>
          </span>
          <button className="btn" onClick={() => setOpen(true)} disabled={loading}>
            Switch
          </button>
          <button className="btn ghost" onClick={unenroll} disabled={loading}>
            Unenroll
          </button>
        </div>
      ) : (
        <button className="btn primary" onClick={() => setOpen(true)}>
          Enroll in sequence
        </button>
      )}
      {modal}
    </>
  );
}
