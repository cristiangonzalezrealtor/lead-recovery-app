import Link from "next/link";
import type { ActivitySignals as Signals } from "@/lib/core/dashboard/activity";
import { ScoreBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/core/dashboard/time";
import type { ScoreBand } from "@prisma/client";

export function ActivitySignals({ signals }: { signals: Signals }) {
  if (!signals.hasAnySignal) return null;

  const { counts, heatingUp } = signals;

  return (
    <div className="card signals-card">
      <div className="card-header-row">
        <div>
          <h2>
            <span className="bolt-icon">⚡</span> Activity signals
          </h2>
          <div className="subtitle">Your leads are active right now.</div>
        </div>
      </div>

      <div className="signal-counters">
        <div className="signal-tile">
          <div className="signal-n">{counts.opens24h}</div>
          <div className="signal-label">Opens 24h</div>
        </div>
        <div className="signal-tile">
          <div className="signal-n">{counts.clicks24h}</div>
          <div className="signal-label">Clicks 24h</div>
        </div>
        <div className="signal-tile">
          <div className="signal-n">{counts.replies24h}</div>
          <div className="signal-label">Replies 24h</div>
        </div>
      </div>

      {heatingUp.length > 0 && (
        <>
          <div className="signal-section-label">Heating up</div>
          <div className="signal-list">
            {heatingUp.map((l) => {
              const name =
                [l.firstName, l.lastName].filter(Boolean).join(" ") ||
                l.email ||
                "Lead";
              return (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="signal-row"
                >
                  <span className="signal-arrow">↗</span>
                  <div className="signal-row-body">
                    <div className="signal-row-headline">
                      <span className="signal-name">{name}</span>
                      <span className="signal-meta">
                        · {l.leadType} ·{" "}
                      </span>
                      <ScoreBadge band={l.scoreBand as ScoreBand} />
                      <span className="signal-meta"> · {l.score}</span>
                    </div>
                    <div className="signal-row-text">
                      {l.signalText} {timeAgo(l.signalAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
