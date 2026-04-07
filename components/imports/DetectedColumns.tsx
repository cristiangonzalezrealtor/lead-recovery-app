interface Props {
  filename: string;
  rowCount: number;
  detectedColumns: Record<string, string>;
  unmappedHeaders: string[];
  missingCriticalFields: boolean;
  onContinue: () => void;
  onRemap: () => void;
  onReset: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "first name",
  lastName: "last name",
  fullName: "full name",
  email: "email",
  phone: "phone",
  source: "source",
  leadType: "lead type",
  intentSignal: "notes",
  tags: "tags",
  timeframeDays: "timeframe",
};

export function DetectedColumns({
  filename,
  rowCount,
  detectedColumns,
  unmappedHeaders,
  missingCriticalFields,
  onContinue,
  onRemap,
  onReset,
}: Props) {
  const detectedEntries = Object.entries(detectedColumns);

  return (
    <div className="card">
      <div className="parse-file">
        <span className="parse-check">✓</span>
        <strong>{filename}</strong>
        <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
          · {rowCount} rows
        </span>
      </div>

      {!missingCriticalFields && (
        <div className="parse-reassurance">
          This looks good — we can work with this data.
        </div>
      )}

      <div className="parse-section-label">
        We found these columns automatically:
      </div>

      {detectedEntries.length === 0 ? (
        <div className="empty">
          We didn&rsquo;t recognize any columns. Try mapping them yourself below.
        </div>
      ) : (
        <ul className="parse-detected-list">
          {detectedEntries.map(([field, header]) => (
            <li key={field}>
              <span className="parse-detected-check">✓</span>
              <strong>{header}</strong>
              <span className="parse-arrow">→</span>
              <span className="parse-detected-field">
                {FIELD_LABELS[field] ?? field}
              </span>
            </li>
          ))}
        </ul>
      )}

      {unmappedHeaders.length > 0 && (
        <>
          <div className="parse-section-label" style={{ marginTop: 16 }}>
            We&rsquo;ll skip these (not needed):
          </div>
          <ul className="parse-skipped-list">
            {unmappedHeaders.slice(0, 8).map((h) => (
              <li key={h}>{h}</li>
            ))}
            {unmappedHeaders.length > 8 && (
              <li className="muted">+ {unmappedHeaders.length - 8} more</li>
            )}
          </ul>
        </>
      )}

      {missingCriticalFields && (
        <div className="alert error" style={{ marginTop: 16 }}>
          We couldn&rsquo;t find an email or phone column. Map them yourself
          below to continue.
        </div>
      )}

      <div className="parse-actions">
        {!missingCriticalFields && (
          <button className="btn primary" onClick={onContinue}>
            Looks right — preview rows →
          </button>
        )}
        <button className="btn" onClick={onRemap}>
          {missingCriticalFields ? "Map columns" : "Fix mapping"}
        </button>
        <button className="btn ghost" onClick={onReset}>
          Use a different file
        </button>
      </div>
    </div>
  );
}
