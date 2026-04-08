import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOnboardingState } from "@/lib/core/onboarding/state";
import { ChecklistReopenLink } from "@/components/onboarding/ChecklistReopenLink";
import { ClearLeadsButton } from "@/components/ui/ClearLeadsButton";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export default async function SettingsPage() {
  const user = await requireUser();
  const onboarding = await getOnboardingState(user.id);
  const leadCount = await prisma.lead.count({ where: { userId: user.id } });

  const showReopen = onboarding.completedAt === null;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Signed in as {user.email}.</p>
      </div>

      <div className="card">
        <h2>Brand profile</h2>
        <div className="subtitle">Used to personalize every sequence step.</div>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "8px 16px",
            margin: "12px 0 0",
          }}
        >
          <dt style={{ color: "var(--ink-soft)" }}>Agent name</dt>
          <dd style={{ margin: 0 }}>
            {user.brandProfile?.agentName ?? "—"}
          </dd>
          <dt style={{ color: "var(--ink-soft)" }}>Market</dt>
          <dd style={{ margin: 0 }}>
            {[user.brandProfile?.marketCity, user.brandProfile?.marketState]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
          <dt style={{ color: "var(--ink-soft)" }}>Brokerage</dt>
          <dd style={{ margin: 0 }}>
            {user.brandProfile?.brokerage ?? "—"}
          </dd>
          <dt style={{ color: "var(--ink-soft)" }}>Tone</dt>
          <dd style={{ margin: 0 }}>
            {user.brandProfile?.tone ?? "—"}
          </dd>
        </dl>
        <p
          style={{
            margin: "12px 0 0",
            color: "var(--ink-mute)",
            fontSize: 12,
          }}
        >
          Profile editing lives in the onboarding flow today. Reach out if you
          need to change anything above.
        </p>
      </div>

      <div className="card">
        <h2>Appearance</h2>
        <div className="subtitle">
          Pick a theme. Your choice is saved to this browser.
        </div>
        <div style={{ marginTop: 12 }}>
          <ThemeSwitcher />
        </div>
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

      <div className="card" style={{ borderColor: "#b33" }}>
        <h2 style={{ color: "#b33" }}>Danger zone</h2>
        <div className="subtitle">
          Clear everything and start over with a fresh import.
        </div>
        <p style={{ margin: "8px 0 12px", color: "var(--ink-soft)" }}>
          Deletes every lead, every activity, every sequence enrollment, and
          your import history. Your account, brand profile, and the built-in
          sequence templates stay put.
        </p>
        <ClearLeadsButton leadCount={leadCount} />
      </div>
    </>
  );
}
