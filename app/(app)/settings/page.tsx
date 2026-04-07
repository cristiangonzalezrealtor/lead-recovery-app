import { requireUser } from "@/lib/auth";
import { getOnboardingState } from "@/lib/core/onboarding/state";
import { ChecklistReopenLink } from "@/components/onboarding/ChecklistReopenLink";

export default async function SettingsPage() {
  const user = await requireUser();
  const onboarding = await getOnboardingState(user.id);

  const showReopen = onboarding.completedAt === null;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Signed in as {user.email}.</p>
      </div>

      <div className="card">
        <h2>Brand profile</h2>
        <div className="subtitle">Agent: {user.brandProfile?.agentName ?? "—"}</div>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>
          Full settings UI ships in Phase 5.
        </p>
      </div>

      {showReopen && (
        <div className="card">
          <h2>Setup progress</h2>
          <div className="subtitle">
            {onboarding.progress.done}/{onboarding.progress.total} steps complete
            {" · "}finish the checklist to get the most out of your database.
          </div>
          <div style={{ marginTop: 12 }}>
            <ChecklistReopenLink
              done={onboarding.progress.done}
              total={onboarding.progress.total}
            />
          </div>
        </div>
      )}

      <div className="card">
        <form action="/api/auth/logout" method="post">
          <button className="btn" type="submit">Sign out</button>
        </form>
      </div>
    </>
  );
}
