import { requireUser } from "@/lib/auth";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? "not set";

  return (
    <>
      <div className="page-header">
        <h1>Integrations</h1>
        <p>
          LeadRevive connects to one email provider and sits beside your CRM.
          Nothing more, nothing less.
        </p>
      </div>

      <div className="card">
        <div className="card-header-row">
          <div>
            <h2>Email delivery &mdash; Resend</h2>
            <div className="subtitle">
              Sequence steps are delivered through Resend.
            </div>
          </div>
          <span
            className={`badge ${hasResendKey ? "hot" : "low"}`}
            style={{ fontSize: 11 }}
          >
            {hasResendKey ? "connected" : "not connected"}
          </span>
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "8px 16px",
            margin: "12px 0 0",
          }}
        >
          <dt style={{ color: "var(--ink-soft)" }}>API key</dt>
          <dd style={{ margin: 0 }}>
            {hasResendKey ? (
              <span style={{ color: "var(--ink-soft)" }}>
                Set via <code>RESEND_API_KEY</code> env var
              </span>
            ) : (
              <span style={{ color: "var(--ink-soft)" }}>
                Not set &mdash; sends will be logged to the console instead of
                delivered.
              </span>
            )}
          </dd>

          <dt style={{ color: "var(--ink-soft)" }}>From address</dt>
          <dd style={{ margin: 0 }}>
            <code>{fromAddress}</code>
          </dd>

          <dt style={{ color: "var(--ink-soft)" }}>Tracking</dt>
          <dd style={{ margin: 0, color: "var(--ink-soft)" }}>
            Opens, clicks, and unsubscribes are tracked with HMAC-signed tokens.
          </dd>
        </dl>

        {!hasResendKey && (
          <div
            className="empty"
            style={{ marginTop: 16, lineHeight: 1.6 }}
          >
            <strong>To enable real sending:</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li>
                Sign up at{" "}
                <a href="https://resend.com" target="_blank" rel="noreferrer">
                  resend.com
                </a>{" "}
                and create an API key.
              </li>
              <li>
                Verify your sending domain (or use Resend&rsquo;s sandbox
                address).
              </li>
              <li>
                Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in
                your Render environment variables.
              </li>
              <li>Redeploy. The badge above will flip to <em>connected</em>.</li>
            </ol>
          </div>
        )}
      </div>

      <div className="card">
        <h2>CRM</h2>
        <div className="subtitle">
          LeadRevive sits beside your CRM &mdash; it doesn&rsquo;t replace it.
        </div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          Import your lead list as a CSV export from Follow Up Boss, kvCORE,
          Sierra Interactive, or any other CRM. We&rsquo;ll tell you who to call
          today and get out of the way.
        </p>
      </div>

      <div className="card">
        <h2>Reply webhook</h2>
        <div className="subtitle">
          Optional &mdash; pipes inbound replies into the lead activity feed.
        </div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          Point your email provider&rsquo;s inbound webhook at{" "}
          <code>/api/webhooks/inbound-reply/&lt;secret&gt;</code>. A reply
          automatically pauses the active sequence for that lead and flips the
          status to <em>replied</em>.
        </p>
      </div>

      <div className="card">
        <div style={{ color: "var(--ink-mute)", fontSize: 12 }}>
          Signed in as {user.email}
        </div>
      </div>
    </>
  );
}
