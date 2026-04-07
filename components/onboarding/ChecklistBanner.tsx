// Soft reminder banner — shown on the dashboard 48h after the user
// dismissed the full checklist without completing it.

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChecklistBanner({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onReopen() {
    setLoading(true);
    await fetch("/api/onboarding/reopen", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="checklist-banner">
      <div className="checklist-banner-body">
        <span className="checklist-banner-icon">○</span>
        <span>
          You still have {total - done} setup step{total - done === 1 ? "" : "s"}
          {" "}to finish.{" "}
          <strong>{done}/{total} complete.</strong>
        </span>
      </div>
      <button className="btn" onClick={onReopen} disabled={loading}>
        Reopen checklist
      </button>
    </div>
  );
}
