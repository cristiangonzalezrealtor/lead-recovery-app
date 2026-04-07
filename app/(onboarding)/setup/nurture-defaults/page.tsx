import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function NurtureDefaults() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="nurture-defaults" />
      <h1>Nurture defaults</h1>
      <p className="lede">
        Pick the default nurture style for each lead type. You can change this
        per lead later. (Full sequence library ships in Phase 2.)
      </p>
      <div className="card">
        <div className="empty">Sequence selection will live here once the library ships.</div>
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/review-import">Back</Link>
        <Link className="btn primary" href="/setup/sequence-defaults">Continue</Link>
      </div>
    </div>
  );
}
