import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseCsv } from "@/lib/core/import/csv";
import { stage } from "@/lib/core/import/staging";

const Body = z.object({
  filename: z.string().min(1),
  text: z.string().min(1),
  mapping: z.record(z.string()).optional(), // optional manual override
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const preview = parseCsv(parsed.data.text, parsed.data.mapping);
  const stagingId = stage(user.id, parsed.data.filename, preview);

  return NextResponse.json({
    stagingId,
    filename: parsed.data.filename,
    summary: {
      headers: preview.headers,
      detectedColumns: preview.detectedColumns,
      unmappedHeaders: preview.unmappedHeaders,
      missingCriticalFields: preview.missingCriticalFields,
      totalRows: preview.totalRows,
      readyRows: preview.readyRows,
      warningRows: preview.warningRows,
      errorRows: preview.errorRows,
      duplicateRows: preview.duplicateRows,
      sample: preview.sample,
    },
  });
}
