import Link from "next/link";
import type { Lead } from "@prisma/client";
import { ScoreBadge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/leads/ConfidenceBadge";
import { EnrollButton } from "@/components/leads/EnrollButton";
import { urgencyPhrase } from "@/lib/core/dashboard/time";

interface SequenceOption {
  id: string;
  name: string;
  leadType: string;
}

interface Props {
  position: number;
  lead: Lead;
  groupLabel?: string;
  hasActiveEnrollment: boolean;
  sequencesForType: SequenceOption[];
}

export function TopFiveLeadRow({
  position,
  lead,
  groupLabel,
  hasActiveEnrollment,
  sequencesForType,
}: Props) {
  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    lead.email ||
    "(no name)";

  const urgency = urgencyPhrase(lead);

  return (
    <div className="top-five-row">
      <div className="top-five-position">{position}</div>

      <div className="top-five-body">
        <div className="top-five-headline">
          <Link href={`/leads/${lead.id}?from=top-5`} className="top-five-name">
            {name}
          </Link>
          <ScoreBadge band={lead.scoreBand} />
          <span className="top-five-score">{lead.score}</span>
          {lead.confidence && (
            <ConfidenceBadge
              level={lead.confidence}
              reason={lead.confidenceReason}
            />
          )}
          {groupLabel && (
            <span className="top-five-group">{groupLabel}</span>
          )}
        </div>

        <div className="top-five-meta">
          {lead.leadType} · <span className="urgency">{urgency}</span>
        </div>

        <div className="top-five-action">
          <span className="arrow">→</span> {lead.nextAction ?? "Open lead"}
          {lead.nextActionReason && (
            <div className="top-five-reason">{lead.nextActionReason}</div>
          )}
        </div>
      </div>

      <div className="top-five-actions">
        {lead.phone ? (
          <a className="btn primary" href={`tel:${lead.phone.replace(/\s+/g, "")}`}>
            Call now
          </a>
        ) : (
          <Link className="btn primary" href={`/leads/${lead.id}?from=top-5`}>
            Open lead
          </Link>
        )}
        {lead.phone && (
          <Link className="btn" href={`/leads/${lead.id}?from=top-5`}>
            Open
          </Link>
        )}
        {!hasActiveEnrollment && (
          <EnrollButton
            leadId={lead.id}
            sequences={sequencesForType}
            variant="compact"
          />
        )}
      </div>
    </div>
  );
}
