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
        LeadRevive ships with 18 built-in sequences — 3 variants for each of the
        6 lead types. You can pick a different one per lead any time.
      </p>
      <div className="card">
        <h2>What&rsquo;s included</h2>
        <div className="subtitle">Written to convert. No templating required.</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-soft)" }}>
          <li>Seller, buyer, investor, rental, valuation, and dormant tracks</li>
          <li>3 tone variants per track (direct, warm, and consultative)</li>
          <li>Personalized at render time using what we know about each lead</li>
        </ul>
        <p style={{ margin: "12px 0 0", color: "var(--ink-soft)" }}>
          Browse them any time at <Link href="/sequences">Sequence library</Link>.
        </p>
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/setup/review-import">Back</Link>
        <Link className="btn primary" href="/setup/sequence-defaults">Continue</Link>
      </div>
    </div>
  );
}
