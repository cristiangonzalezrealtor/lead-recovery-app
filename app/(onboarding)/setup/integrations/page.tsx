import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function IntegrationsStep() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="integrations" />
      <h1>Connect your stack</h1>
      <p className="lede">
        V1 uses <strong>Resend</strong> as the single email provider. Webhook and
        Zapier intake ship in Phase 4.
      </p>
      <div className="card">
        <h2>Email provider</h2>
        <div className="subtitle">Resend — one provider, zero config churn.</div>
        <div className="empty">API key setup lives in Settings once Phase 2 ships email.</div>
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/sequence-defaults">Back</Link>
        <Link className="btn primary" href="/setup/launch">Continue</Link>
      </div>
    </div>
  );
}
