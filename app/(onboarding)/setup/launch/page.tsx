import Link from "next/link";
import { Stepper } from "@/components/onboarding/Stepper";
import { requireUser } from "@/lib/auth";

export default async function Launch() {
  await requireUser();
  return (
    <div className="onboard">
      <Stepper current="launch" />
      <h1>Your dashboard is ready</h1>
      <p className="lede">
        Every lead has been scored and explained. Time to see who needs you today.
      </p>
      <div className="actions">
        <span />
        <Link className="btn primary" href="/dashboard">Open dashboard</Link>
      </div>
    </div>
  );
}
