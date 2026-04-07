import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getStaged, dropStaged } from "@/lib/core/import/staging";
import { commitImport } from "@/lib/core/import/commit";

const Body = z.object({
  stagingId: z.string().min(1),
  markAsDormant: z.boolean().default(false),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const staged = getStaged(parsed.data.stagingId, user.id);
  if (!staged) return NextResponse.json({ error: "Staged import expired" }, { status: 404 });

  const result = await commitImport(staged.preview, {
    userId: user.id,
    filename: staged.filename,
    markAsDormant: parsed.data.markAsDormant,
  });

  dropStaged(parsed.data.stagingId);
  return NextResponse.json(result);
}
