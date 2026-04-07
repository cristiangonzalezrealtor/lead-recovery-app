import type { Confidence } from "@prisma/client";

const TOOLTIP_BASE =
  "How reliable this lead data is. High means complete information and real engagement. This is separate from the lead score.";

const DOT: Record<Confidence, string> = {
  high: "●",
  medium: "◐",
  low: "○",
};

interface Props {
  level: Confidence;
  reason?: string | null;
  showLabel?: boolean; // default true
  variant?: "default" | "compact"; // compact = no "confidence" suffix
}

export function ConfidenceBadge({
  level,
  reason,
  showLabel = true,
  variant = "default",
}: Props) {
  const tooltip = reason ? `${TOOLTIP_BASE}\n\nWhy: ${reason}` : TOOLTIP_BASE;

  const label =
    variant === "compact"
      ? level
      : `${level} confidence`;

  return (
    <span
      className={`confidence-badge confidence-${level}`}
      title={tooltip}
      aria-label={`${level} confidence`}
    >
      <span className="confidence-dot" aria-hidden>
        {DOT[level]}
      </span>
      {showLabel && <span className="confidence-label">{label}</span>}
    </span>
  );
}
