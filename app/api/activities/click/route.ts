import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ingestActivity } from "@/lib/core/activity/ingest";

const Body = z.object({
  leadId: z.string().min(1),
  messageId: z.string().optional(),
  url: z.string().url().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await ingestActivity({
    userId: user.id,
    leadId: parsed.data.leadId,
    type: "email_click",
    messageId: parsed.data.messageId,
    metadata: { url: parsed.data.url },
  });
  if (!result.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
