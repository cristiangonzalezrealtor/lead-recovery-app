"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/imports/DropZone";
import { DetectedColumns } from "@/components/imports/DetectedColumns";
import { ManualMappingPanel } from "@/components/imports/ManualMappingPanel";
import { PreviewCounters } from "@/components/imports/PreviewCounters";
import { PreviewTable } from "@/components/imports/PreviewTable";
import { ImportInstructions } from "@/components/imports/ImportInstructions";

type Stage =
  | { kind: "drop" }
  | { kind: "parsing" }
  | { kind: "parsed"; data: ParsedData }
  | { kind: "mapping"; data: ParsedData }
  | { kind: "preview"; data: ParsedData }
  | { kind: "importing" };

interface ParsedData {
  stagingId: string;
  filename: string;
  text: string;
  summary: any;
}

export default function NewImportPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "drop" });
  const [markAsDormant, setMarkAsDormant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parse(file: File, mapping?: Record<string, string>) {
    setError(null);
    setStage({ kind: "parsing" });
    try {
      const text = await file.text();
      const res = await fetch("/api/imports/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, text, mapping }),
      });
      if (!res.ok) throw new Error("parse failed");
      const data = await res.json();
      const parsed: ParsedData = {
        stagingId: data.stagingId,
        filename: data.filename,
        text,
        summary: data.summary,
      };
      // If critical fields are missing, jump straight to mapping panel.
      if (data.summary.missingCriticalFields) {
        setStage({ kind: "mapping", data: parsed });
      } else {
        setStage({ kind: "parsed", data: parsed });
      }
    } catch (err) {
      setError("That file couldn't be parsed. Make sure it's a valid CSV.");
      setStage({ kind: "drop" });
    }
  }

  async function reparseWithMapping(mapping: Record<string, string>) {
    if (stage.kind !== "mapping") return;
    const file = new File([stage.data.text], stage.data.filename, {
      type: "text/csv",
    });
    await parse(file, mapping);
  }

  async function commit() {
    if (stage.kind !== "preview" && stage.kind !== "parsed") return;
    const data = stage.kind === "preview" ? stage.data : stage.data;
    setStage({ kind: "importing" });
    setError(null);
    const res = await fetch("/api/imports/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stagingId: data.stagingId, markAsDormant }),
    });
    if (!res.ok) {
      setError("Something went wrong on our side. Try the import again.");
      setStage({ kind: "preview", data });
      return;
    }
    const result = await res.json();
    router.push(`/setup/results/${result.importId}`);
  }

  // ── Render by stage ──────────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <h1>Upload your leads</h1>
        <p>
          We&rsquo;ll analyze your database and show you who to call today.
        </p>
      </div>

      {(stage.kind === "drop" || stage.kind === "parsing") && (
        <>
          <DropZone
            onFile={(f) => parse(f)}
            loading={stage.kind === "parsing"}
            error={error}
          />

          <div className="upload-helper">
            <div className="upload-fields-list">
              <div className="upload-fields-label">
                We&rsquo;ll look for these columns automatically:
              </div>
              <ul>
                <li>Name (full name OR first + last)</li>
                <li>Email</li>
                <li>Phone</li>
                <li>Source (Zillow, Realtor.com, Facebook, etc.)</li>
              </ul>
            </div>
            <div className="upload-template-callout">
              <strong>Don&rsquo;t have a CSV? Start with our template</strong>
              <a className="btn" href="/sample-leads.csv" download>
                Download sample CSV
              </a>
            </div>
          </div>

          <ImportInstructions />
        </>
      )}

      {stage.kind === "parsed" && (
        <>
          <DetectedColumns
            filename={stage.data.filename}
            rowCount={stage.data.summary.totalRows}
            detectedColumns={stage.data.summary.detectedColumns}
            unmappedHeaders={stage.data.summary.unmappedHeaders}
            missingCriticalFields={stage.data.summary.missingCriticalFields}
            onContinue={() => setStage({ kind: "preview", data: stage.data })}
            onRemap={() => setStage({ kind: "mapping", data: stage.data })}
            onReset={() => setStage({ kind: "drop" })}
          />
        </>
      )}

      {stage.kind === "mapping" && (
        <ManualMappingPanel
          headers={stage.data.summary.headers}
          initialMapping={stage.data.summary.detectedColumns}
          onCancel={() => setStage({ kind: "parsed", data: stage.data })}
          onConfirm={(mapping) => reparseWithMapping(mapping)}
        />
      )}

      {stage.kind === "preview" && (
        <>
          <div className="card">
            <h2>Preview — {stage.data.filename}</h2>
            <p className="subtitle">
              We&rsquo;re about to import {stage.data.summary.readyRows} leads.
              Here are the first 10 rows.
            </p>

            <PreviewCounters
              ready={stage.data.summary.readyRows}
              warnings={stage.data.summary.warningRows}
              duplicates={stage.data.summary.duplicateRows}
            />

            <div className="preview-reassurance">
              You can clean this up later — nothing is permanent.
            </div>

            <PreviewTable rows={stage.data.summary.sample} />
          </div>

          <div className="card">
            <label className="dormant-toggle">
              <input
                type="checkbox"
                checked={markAsDormant}
                onChange={(e) => setMarkAsDormant(e.target.checked)}
              />
              <span>
                <strong>Mark all imported leads as dormant</strong>
                <div className="dormant-toggle-sub">
                  Use this when bulk-loading an old list for revival.
                </div>
              </span>
            </label>
          </div>

          {error && <div className="alert error">{error}</div>}

          <div className="parse-actions">
            <button
              className="btn ghost"
              onClick={() => setStage({ kind: "parsed", data: stage.data })}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              onClick={commit}
              disabled={stage.data.summary.readyRows === 0}
            >
              Import {stage.data.summary.readyRows} leads → see results
            </button>
          </div>
        </>
      )}

      {stage.kind === "importing" && (
        <div className="card">
          <div className="results-loading">
            <div className="spinner" />
            <h1>Importing your leads…</h1>
            <p>
              Scoring every lead and finding hidden deals. This usually takes a
              few seconds.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
