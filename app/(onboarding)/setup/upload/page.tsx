"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/onboarding/Stepper";
import { DropZone } from "@/components/imports/DropZone";
import { ImportInstructions } from "@/components/imports/ImportInstructions";

export default function UploadStep() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setLoading(true);
    const text = await file.text();
    const res = await fetch("/api/imports/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, text }),
    });
    if (!res.ok) {
      setLoading(false);
      setError("That file couldn't be parsed. Make sure it's a valid CSV.");
      return;
    }
    const data = await res.json();
    sessionStorage.setItem(
      `staging:${data.stagingId}`,
      JSON.stringify({ summary: data.summary, filename: data.filename })
    );
    router.push(`/setup/review-import?staging=${data.stagingId}`);
  }

  return (
    <div className="onboard" style={{ maxWidth: 640 }}>
      <Stepper current="upload" />
      <h1>Upload your leads</h1>
      <p className="lede">
        Drop a CSV from your CRM. We&rsquo;ll auto-detect columns and show a
        full preview before anything is imported.
      </p>

      <DropZone onFile={onFile} loading={loading} error={error} />

      <div className="upload-helper">
        <div className="upload-fields-list">
          <div className="upload-fields-label">
            We&rsquo;ll look for these columns automatically:
          </div>
          <ul>
            <li>Name (full name OR first + last)</li>
            <li>Email</li>
            <li>Phone</li>
            <li>Source (Zillow, Realtor.com, Facebook, etc.)</li>
          </ul>
        </div>
        <div className="upload-template-callout">
          <strong>Don&rsquo;t have a CSV? Start with our template</strong>
          <a className="btn" href="/sample-leads.csv" download>
            Download sample CSV
          </a>
        </div>
      </div>

      <ImportInstructions />

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()}>
          Back
        </button>
      </div>
    </div>
  );
}
