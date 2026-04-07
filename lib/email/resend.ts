// Resend adapter — single email provider for V1 (adjustment #4).
//
// In dev mode (no RESEND_API_KEY), logs the message and returns a fake
// message ID so the pipeline can be tested end-to-end without a real key.

export interface SendArgs {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  messageId: string;
  provider: "resend" | "dev-log";
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback — log and return a fake id.
    console.log("[email:dev-log]", {
      to: args.to,
      from: args.from,
      subject: args.subject,
    });
    return {
      messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: "dev-log",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo,
      headers: args.headers,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { id: string };
  return { messageId: data.id, provider: "resend" };
}
