import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function SequenceDefaults() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="sequence-defaults" />
      <h1>Sequence defaults</h1>
      <p className="lede">Tone, send window, and signature. Phase 2 wires these into real sends.</p>
      <div className="card"><div className="empty">Configuration coming in Phase 2.</div></div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/nurture-defaults">Back</Link>
        <Link className="btn primary" href="/setup/integrations">Continue</Link>
      </div>
    </div>
  );
}
