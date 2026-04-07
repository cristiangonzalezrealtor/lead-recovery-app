import Link from "next/link";
import type { OnboardingStepState } from "@/lib/core/onboarding/state";

export function ChecklistItem({
  step,
  isNext,
}: {
  step: OnboardingStepState;
  isNext: boolean;
}) {
  return (
    <div
      className={`checklist-item ${step.done ? "done" : ""} ${
        isNext ? "next-up" : ""
      }`}
    >
      <div className="checklist-status" aria-hidden>
        {step.done ? "✓" : "○"}
      </div>
      <div className="checklist-body">
        <div className="checklist-title">{step.title}</div>
        <div className="checklist-description">{step.description}</div>
        {step.reinforcement && !step.done && (
          <div className="checklist-reinforcement">{step.reinforcement}</div>
        )}
      </div>
      {!step.done && (
        <div className="checklist-cta">
          <Link className="btn" href={step.ctaHref}>
            {step.ctaLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
