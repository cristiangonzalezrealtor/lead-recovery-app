"use client";
import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

export function DropZone({ onFile, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(false);

  function validateAndSubmit(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setRejected(true);
      setTimeout(() => setRejected(false), 1500);
      return;
    }
    onFile(file);
  }

  return (
    <div>
      <div
        className={`drop-zone ${dragging ? "dragging" : ""} ${
          rejected ? "rejected" : ""
        } ${loading ? "loading" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSubmit(file);
        }}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSubmit(f);
          }}
        />

        {loading ? (
          <>
            <div className="drop-zone-spinner" />
            <div className="drop-zone-headline">Importing your leads…</div>
            <div className="drop-zone-sub">
              Scoring every lead and finding hidden deals.
            </div>
          </>
        ) : rejected ? (
          <>
            <div className="drop-zone-icon">⚠</div>
            <div className="drop-zone-headline">CSV files only</div>
            <div className="drop-zone-sub">
              We need a .csv file. Excel files work — just save them as CSV first.
            </div>
          </>
        ) : (
          <>
            <div className="drop-zone-icon">⬆</div>
            <div className="drop-zone-headline">Drop your CSV here to get started</div>
            <div className="drop-zone-sub">
              or click to choose a file · Most agents upload 200–1,000 leads
            </div>
          </>
        )}
      </div>

      {error && <div className="alert error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
