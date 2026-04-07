import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function SequenceDefaults() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="sequence-defaults" />
      <h1>Sequence defaults</h1>
      <p className="lede">
        Every sequence step is personalized at send time using your brand
        profile, send window, and tone.
      </p>
      <div className="card">
        <h2>How defaults work</h2>
        <div className="subtitle">Set once, applied everywhere.</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-soft)" }}>
          <li>
            <strong>Tone</strong> — pulled from your brand profile and injected
            into every personalization pass.
          </li>
          <li>
            <strong>Send window</strong> — sequences only send during your
            configured hours (default 9am–5pm in your timezone).
          </li>
          <li>
            <strong>Signature</strong> — your agent name and market get appended
            automatically to every step.
          </li>
        </ul>
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/nurture-defaults">Back</Link>
        <Link className="btn primary" href="/setup/integrations">Continue</Link>
      </div>
    </div>
  );
}
