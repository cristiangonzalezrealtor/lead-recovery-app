import type { ParsedRow } from "@/lib/core/import/csv";

const ICON: Record<ParsedRow["severity"], string> = {
  ok: "✓",
  warning: "⚠",
  error: "✗",
};

export function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="preview-table-wrap">
      {rows.map((r) => {
        const name =
          [r.firstName, r.lastName].filter(Boolean).join(" ") || "(no name)";
        return (
          <div className={`preview-row severity-${r.severity}`} key={r.rowIndex}>
            <div className={`preview-row-icon icon-${r.severity}`}>
              {ICON[r.severity]}
            </div>
            <div className="preview-row-num">{r.rowIndex}</div>
            <div className="preview-row-name">{name}</div>
            <div className="preview-row-email">{r.email || "—"}</div>
            <div className="preview-row-phone">{r.phone || "—"}</div>
            <div className="preview-row-source">{r.source || "—"}</div>
            {(r.warnings.length > 0 || r.errors.length > 0) && (
              <div className="preview-row-note">
                {r.errors[0] ?? r.warnings[0]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
