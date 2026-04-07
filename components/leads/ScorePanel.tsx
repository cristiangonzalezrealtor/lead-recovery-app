import type { Confidence, LeadScoreFactor, ScoreBand } from "@prisma/client";
import { ScoreBadge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function ScorePanel({
  score,
  band,
  factors,
  confidence,
  confidenceReason,
}: {
  score: number;
  band: ScoreBand;
  factors: LeadScoreFactor[];
  confidence?: Confidence | null;
  confidenceReason?: string | null;
}) {
  return (
    <div className="card score-panel">
      <h2>Lead Score</h2>
      <div className="subtitle">Every point is traceable — this is the full breakdown.</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8 }}>
        <div className="total">{score}</div>
        <ScoreBadge band={band} />
      </div>
      <div className="factors">
        {factors.length === 0 ? (
          <div className="empty">No factors recorded yet — this lead has not been scored.</div>
        ) : (
          factors.map((f) => (
            <div className="factor" key={f.id}>
              <span className="label">{f.factorLabel}</span>
              <span className="pts">+{f.points}</span>
            </div>
          ))
        )}
      </div>

      {confidence && (
        <div className="score-panel-confidence">
          <div className="score-panel-confidence-row">
            <span className="score-panel-confidence-label">Confidence:</span>
            <ConfidenceBadge level={confidence} reason={confidenceReason} />
          </div>
          {confidenceReason && (
            <div className="score-panel-confidence-reason">{confidenceReason}</div>
          )}
        </div>
      )}
    </div>
  );
}
