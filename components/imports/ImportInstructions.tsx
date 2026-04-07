"use client";
import { useState } from "react";

const CRMS = [
  {
    key: "fub",
    name: "Follow Up Boss",
    steps: [
      "Log into Follow Up Boss",
      "Click People in the left sidebar",
      "Click the gear icon (top right of the list)",
      "Click Export to CSV",
      "Open your downloads folder and grab the file",
      "Drag it onto this page above",
    ],
  },
  {
    key: "kvcore",
    name: "kvCORE",
    steps: [
      "Log into kvCORE",
      "Go to Contacts → Smart CRM",
      "Filter to the leads you want (or skip filtering for everyone)",
      "Click the export icon at the top of the contact list",
      "Choose CSV as the format",
      "Drag the downloaded file here",
    ],
  },
  {
    key: "boomtown",
    name: "BoomTown",
    steps: [
      "Log into BoomTown",
      "Go to People",
      "Use the bulk action menu and select Export",
      "Pick All Contacts or use a filter",
      "Drag the file here",
    ],
  },
  {
    key: "sierra",
    name: "Sierra Interactive",
    steps: [
      "Log into Sierra",
      "Click Contacts",
      "Click Export List at the top right",
      "Choose CSV",
      "Drag the file here",
    ],
  },
  {
    key: "rg",
    name: "Real Geeks",
    steps: [
      "Log into the Real Geeks admin",
      "Go to Leads → Manage Leads",
      "Click Export above the lead table",
      "Drag the file here",
    ],
  },
  {
    key: "liondesk",
    name: "LionDesk",
    steps: [
      "Log into LionDesk",
      "Go to Contacts",
      "Use the bulk select checkbox at the top, then click Export",
      "Choose CSV",
      "Drag the file here",
    ],
  },
  {
    key: "wise",
    name: "Wise Agent",
    steps: [
      "Log into Wise Agent",
      "Click Contacts → Manage Contacts",
      "Click Export Contacts",
      "Choose CSV format",
      "Drag the file here",
    ],
  },
  {
    key: "other",
    name: "Other / not sure",
    steps: [
      "Most CRMs have an Export button somewhere in your contacts list. Look for 'Export to CSV' or just 'Download'.",
      "If you can't find it, search the CRM's help center for 'export contacts CSV'.",
      "Once you have the file, drag it onto this page — we'll figure out the rest.",
    ],
  },
] as const;

export function ImportInstructions() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="instructions-collapsed">
        <button className="instructions-toggle" onClick={() => setOpen(true)}>
          ▸ Where do I get my leads?
        </button>
      </div>
    );
  }

  if (selected) {
    const crm = CRMS.find((c) => c.key === selected)!;
    return (
      <div className="instructions-card">
        <button className="instructions-toggle" onClick={() => setOpen(false)}>
          ▾ Where do I get my leads? &nbsp;→&nbsp; {crm.name}
        </button>
        <ol className="instructions-steps">
          {crm.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <button
          className="instructions-back"
          onClick={() => setSelected(null)}
        >
          ← Back to all CRMs
        </button>
      </div>
    );
  }

  return (
    <div className="instructions-card">
      <button className="instructions-toggle" onClick={() => setOpen(false)}>
        ▾ Where do I get my leads?
      </button>
      <p className="instructions-sub">
        Pick your CRM — we&rsquo;ll show you exactly how to export.
      </p>
      <div className="instructions-grid">
        {CRMS.map((c) => (
          <button
            key={c.key}
            className="instructions-crm-btn"
            onClick={() => setSelected(c.key)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
