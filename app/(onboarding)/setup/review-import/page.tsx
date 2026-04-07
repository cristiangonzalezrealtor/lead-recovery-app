"use client";
import { Suspense, useEffect, useState } from "react";import { useRouter, useSearchParams } from "next/navigation";
import { Stepper } from "@/components/onboarding/Stepper";

interface Summary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  detectedColumns: Record<string, string>;
  unmappedHeaders: string[];
  sample: Array<{
    rowIndex: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    leadType?: string;
    source?: string;
    errors: string[];
  }>;
}

function ReviewImportInner() {  const router = useRouter();
  const params = useSearchParams();
  const stagingId = params.get("staging");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [markAsDormant, setMarkAsDormant] = useState(false);
  const [filename, setFilename] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stagingId) return;
    // Pull the summary back from the parse endpoint via sessionStorage trick.
    // Simpler: the parse response was received in the upload page; we re-fetch
    // by calling parse was one-shot, so we pull summary from the staged object
    // via a dedicated GET. Phase 1 shortcut: store the last summary in
    // sessionStorage when /upload navigates here.
    const cached = sessionStorage.getItem(`staging:${stagingId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setSummary(parsed.summary);
      setFilename(parsed.filename);
    }
  }, [stagingId]);

  async function onCommit() {
    if (!stagingId) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/imports/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stagingId, markAsDormant }),
    });
    if (!res.ok) {
      setLoading(false);
      const { error } = await res.json().catch(() => ({ error: "Commit failed" }));
      setError(error);
      return;
    }
    const data = await res.json();
    sessionStorage.removeItem(`staging:${stagingId}`);
    // Jump straight to the Results ("wow") screen.
    router.push(`/setup/results/${data.importId}`);
  }

  if (!stagingId) return <div className="onboard"><p>Missing staging id.</p></div>;
  if (!summary) {
    return (
      <div className="onboard">
        <Stepper current="review-import" />
        <h1>Review import</h1>
        <p className="lede">Loading preview…</p>
      </div>
    );
  }

  return (
    <div className="onboard" style={{ maxWidth: 760 }}>
      <Stepper current="review-import" />
      <h1>Review import</h1>
      <p className="lede">{filename}</p>

      <div className="preview-summary">
        <div className="stat"><div className="n">{summary.totalRows}</div><div className="k">Total rows</div></div>
        <div className="stat"><div className="n">{summary.validRows}</div><div className="k">Valid</div></div>
        <div className="stat"><div className="n">{summary.duplicateRows}</div><div className="k">Duplicates</div></div>
        <div className="stat"><div className="n">{summary.invalidRows}</div><div className="k">Invalid</div></div>
      </div>

      <div className="card">
        <h2>Detected columns</h2>
        <div className="subtitle">We matched these fields automatically.</div>
        {Object.keys(summary.detectedColumns).length === 0 ? (
          <div className="empty">No columns matched. Your CSV needs at least an email or phone column.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(summary.detectedColumns).map(([field, header]) => (
              <li key={field}><strong>{field}</strong> ← {header}</li>
            ))}
          </ul>
        )}
        {summary.unmappedHeaders.length > 0 && (
          <div style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 12 }}>
            Ignored columns: {summary.unmappedHeaders.join(", ")}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Sample rows</h2>
        <div className="subtitle">First 10 rows from your file.</div>
        <table className="lead-table">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.sample.map((r) => (
              <tr key={r.rowIndex}>
                <td>{r.rowIndex}</td>
                <td>{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                <td>{r.email || "—"}</td>
                <td>{r.phone || "—"}</td>
                <td>{r.leadType || "—"}</td>
                <td>{r.errors.length === 0 ? "Valid" : <span style={{ color: "#991b1b" }}>{r.errors[0]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={markAsDormant}
            onChange={(e) => setMarkAsDormant(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span>
            <strong>Mark all imported leads as dormant</strong>
            <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
              Use this when you&rsquo;re bulk-loading an old list for revival.
            </div>
          </span>
        </label>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="actions">
        <button className="btn ghost" onClick={() => router.back()}>Back</button>
        <button className="btn primary" onClick={onCommit} disabled={loading || summary.validRows === 0}>
          {loading ? "Importing…" : `Import ${summary.validRows} leads`}
        </button>
      </div>
    </div>
  );
}

export default function ReviewImport() {
  return (
    <Suspense>
      <ReviewImportInner />
    </Suspense>
  );
}
