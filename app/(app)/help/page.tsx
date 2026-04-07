import Link from "next/link";

export default function HelpPage() {
  return (
    <>
      <div className="page-header">
        <h1>Help</h1>
        <p>
          LeadRevive is a lead recovery system. We tell you who to call today so
          deals don&rsquo;t stay hidden in your database.
        </p>
      </div>

      <div className="card">
        <h2>Getting started</h2>
        <div className="subtitle">The 3-minute setup path.</div>
        <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            <strong>Import a CSV.</strong>{" "}
            <Link href="/imports/new">Upload your lead list</Link>. We auto-detect
            Name, Email, Phone, and Source. Rows missing both email and phone are
            skipped.
          </li>
          <li>
            <strong>Review your Top 5.</strong> Open the{" "}
            <Link href="/dashboard">Dashboard</Link>. The Top 5 section shows the
            leads most worth your time today.
          </li>
          <li>
            <strong>Enroll a warm lead in a sequence.</strong> Open any lead and
            click <em>Enroll in sequence</em>. Each step is personalized at send
            time based on what we know about the lead.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>How scoring works</h2>
        <div className="subtitle">
          Every score is transparent. No black box.
        </div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          Each lead gets a 0&ndash;100 score from six factors: intent, timeframe,
          engagement, source quality, data completeness, and fit. Open any lead
          to see the exact breakdown and why it was ranked the way it was.
        </p>
        <div style={{ marginTop: 12 }}>
          <span className="badge hot" style={{ marginRight: 6 }}>Hot 85+</span>
          <span className="badge warm" style={{ marginRight: 6 }}>Warm 65&ndash;84</span>
          <span className="badge nurture" style={{ marginRight: 6 }}>Nurture 40&ndash;64</span>
          <span className="badge low">Low &lt;40</span>
        </div>
      </div>

      <div className="card">
        <h2>Frequently asked</h2>
        <div className="subtitle">Straight answers.</div>
        <dl style={{ margin: 0 }}>
          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            Is this a CRM?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            No. LeadRevive sits beside your CRM. We recover deals hiding in the
            list you already have. Keep using Follow Up Boss, kvCORE, or whatever
            else you use for day-to-day tracking.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            Why are some leads marked &ldquo;dormant&rdquo;?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            A lead becomes dormant when it hasn&rsquo;t been touched in a long
            time or has gone cold. The{" "}
            <Link href="/revival">Revival Center</Link> surfaces the ones worth
            reactivating and gives each a revival probability.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            What&rsquo;s a &ldquo;missed opportunity&rdquo;?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            A lead that showed real intent but never got a follow-up &mdash; a
            hot lead that&rsquo;s gone a week without contact, a lead that
            clicked an email and was never replied to, or a sequence that
            stalled. These are flagged critical, high, or medium.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            How do I send email?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Email goes through Resend. Set <code>RESEND_API_KEY</code> and{" "}
            <code>EMAIL_FROM</code> in your environment. Without the key, sends
            are logged to the dev console instead of being delivered &mdash;
            useful for testing.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            How often do sequences run?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            A background tick runs every 10 minutes and only sends during your
            configured send window (default 9am&ndash;5pm in your timezone). We
            cap sends per user and per tick so you never blast your list.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            What happens when a lead replies or unsubscribes?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Replies automatically pause the sequence and move the lead to{" "}
            <em>replied</em>. Unsubscribes are recorded and the lead is never
            contacted again by any sequence.
          </dd>

          <dt style={{ fontWeight: 600, marginTop: 12 }}>
            Can I edit the sequence templates?
          </dt>
          <dd style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Not yet. V1 ships 18 built-in templates (3 variants × 6 lead types).
            Custom template editing is on the roadmap but isn&rsquo;t required to
            get value &mdash; the built-ins are written to convert.
          </dd>
        </dl>
      </div>

      <div className="card">
        <h2>Need to reach us?</h2>
        <div className="subtitle">We read everything.</div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          If something&rsquo;s broken or confusing, email{" "}
          <a href="mailto:support@leadrevive.ai">support@leadrevive.ai</a> and
          we&rsquo;ll get back to you same day.
        </p>
      </div>
    </>
  );
}
