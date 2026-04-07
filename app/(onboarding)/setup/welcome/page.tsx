import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function Welcome() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="welcome" />
      <h1>Welcome to LeadRevive AI</h1>
      <p className="lede">
        In the next 3 minutes, you&rsquo;ll upload your leads, see who matters most,
        and get a dashboard built around the one question: <em>what should I do
        now?</em>
      </p>
      <div className="actions">
        <span />
        <Link className="btn primary" href="/setup/brand">Get started</Link>
      </div>
    </div>
  );
}
