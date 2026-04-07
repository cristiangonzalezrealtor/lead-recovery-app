// Checklist — server component card shell.
//
// Three states packed into one component:
//   1. showCelebration → "You're all set" card (24h after completion)
//   2. showCard        → full checklist
//   3. otherwise       → renders nothing (parent decides whether to
//                        render the ChecklistBanner soft reminder)

import type { OnboardingState } from "@/lib/core/onboarding/state";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistDismissButton } from "./ChecklistDismissButton";

export function Checklist({ state }: { state: OnboardingState }) {
  if (state.showCelebration) {
    return (
      <div className="checklist-card checklist-celebration">
        <div className="check-circle">✓</div>
        <div>
          <div className="celebration-title">
            You&rsquo;re all set — your system is running
          </div>
          <div className="celebration-sub">
            We&rsquo;ll keep working your leads in the background.
          </div>
        </div>
      </div>
    );
  }

  if (!state.showCard) return null;

  return (
    <div className="checklist-card">
      <div className="checklist-header">
        <div>
          <div className="checklist-title-row">
            <h2>Get your system running</h2>
          </div>
          <p className="checklist-subtitle">
            Complete these steps to start converting leads immediately.
          </p>
        </div>
        <div className="checklist-progress-wrap">
          <div className="checklist-progress-label">
            {state.progress.done}/{state.progress.total} complete
          </div>
          <ChecklistDismissButton />
        </div>
      </div>

      <div className="checklist-progress-bar">
        <div
          className="checklist-progress-fill"
          style={{ width: `${state.progress.percent}%` }}
        />
      </div>

      <div className="checklist-items">
        {state.steps.map((step, i) => (
          <ChecklistItem
            key={step.key}
            step={step}
            isNext={i === state.firstIncompleteIndex}
          />
        ))}
      </div>
    </div>
  );
}
