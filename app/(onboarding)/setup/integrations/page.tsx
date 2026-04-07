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
        LeadRevive uses <strong>Resend</strong> as the email provider. One
        provider, zero config churn.
      </p>
      <div className="card">
        <h2>Email provider</h2>
        <div className="subtitle">Resend handles every sequence send.</div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          Your API key lives in the environment as <code>RESEND_API_KEY</code>.
          Without a key, sends are logged to the console instead of delivered —
          useful while you&rsquo;re testing. Check the{" "}
          <Link href="/integrations">Integrations page</Link> any time to see
          whether you&rsquo;re connected.
        </p>
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/sequence-defaults">Back</Link>
        <Link className="btn primary" href="/setup/launch">Continue</Link>
      </div>
    </div>
  );
}
