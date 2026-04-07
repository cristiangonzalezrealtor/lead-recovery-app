interface Props {
  ready: number;
  warnings: number;
  duplicates: number;
}

export function PreviewCounters({ ready, warnings, duplicates }: Props) {
  return (
    <div className="preview-counters">
      <div className="preview-counter ready">
        <div className="preview-counter-n">{ready}</div>
        <div className="preview-counter-label">Ready to go</div>
      </div>
      <div className="preview-counter warning">
        <div className="preview-counter-n">{warnings}</div>
        <div className="preview-counter-label">With warnings</div>
      </div>
      <div className="preview-counter duplicate">
        <div className="preview-counter-n">{duplicates}</div>
        <div className="preview-counter-label">Duplicates skipped</div>
      </div>
    </div>
  );
}
