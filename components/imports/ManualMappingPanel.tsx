"use client";
import { useState } from "react";

const FIELD_OPTIONS = [
  { value: "", label: "Skip this column" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "fullName", label: "Full name (we'll split it)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags" },
  { value: "intentSignal", label: "Notes / intent" },
];

interface Props {
  headers: string[];
  initialMapping: Record<string, string>; // header → field
  onConfirm: (mapping: Record<string, string>) => void; // returns field → header
  onCancel: () => void;
}

export function ManualMappingPanel({
  headers,
  initialMapping,
  onConfirm,
  onCancel,
}: Props) {
  // headerToField: keyed by header, value is field key
  const [headerToField, setHeaderToField] = useState<Record<string, string>>(
    () => {
      const inverse: Record<string, string> = {};
      for (const [field, header] of Object.entries(initialMapping)) {
        if (header) inverse[header] = field;
      }
      return inverse;
    }
  );

  function setMapping(header: string, field: string) {
    setHeaderToField((prev) => {
      const next = { ...prev };
      // Clear any other header currently using this field
      if (field) {
        for (const h of Object.keys(next)) {
          if (next[h] === field && h !== header) delete next[h];
        }
      }
      if (field) next[header] = field;
      else delete next[header];
      return next;
    });
  }

  const fieldsMapped = Object.values(headerToField);
  const hasEmail = fieldsMapped.includes("email");
  const hasPhone = fieldsMapped.includes("phone");
  const hasName =
    fieldsMapped.includes("firstName") ||
    fieldsMapped.includes("lastName") ||
    fieldsMapped.includes("fullName");

  const canSubmit = hasEmail || hasPhone;

  function submit() {
    // Convert to field → header
    const result: Record<string, string> = {};
    for (const [header, field] of Object.entries(headerToField)) {
      if (field) result[field] = header;
    }
    onConfirm(result);
  }

  return (
    <div className="card mapping-panel">
      <h2>Map your columns</h2>
      <p className="subtitle">
        Tell us which column is which. Skip anything you don&rsquo;t need.
      </p>

      <div className="mapping-list">
        <div className="mapping-row mapping-row-header">
          <div>Your column</div>
          <div className="mapping-arrow">→</div>
          <div>What it is</div>
        </div>
        {headers.map((header) => (
          <div className="mapping-row" key={header}>
            <div className="mapping-header-name">{header}</div>
            <div className="mapping-arrow">→</div>
            <select
              value={headerToField[header] ?? ""}
              onChange={(e) => setMapping(header, e.target.value)}
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mapping-warnings">
        {!hasEmail && !hasPhone && (
          <div className="alert error">
            You need to map either Email or Phone (preferably both). Without one
            of them, we can&rsquo;t contact these leads.
          </div>
        )}
        {(!hasEmail || !hasPhone) && hasEmail !== hasPhone && (
          <div className="mapping-soft-note">
            We&rsquo;ll still import these — leads with only one contact method
            will get a warning, not a block.
          </div>
        )}
        {!hasName && (
          <div className="mapping-soft-note">
            We&rsquo;ll still import these — we&rsquo;ll use email as the name
            when needed.
          </div>
        )}
      </div>

      <div className="parse-actions">
        <button
          className="btn primary"
          onClick={submit}
          disabled={!canSubmit}
        >
          Use this mapping
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
