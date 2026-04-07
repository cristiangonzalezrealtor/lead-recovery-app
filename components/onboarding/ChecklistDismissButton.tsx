"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChecklistDismissButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDismiss() {
    setLoading(true);
    await fetch("/api/onboarding/dismiss", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      className="checklist-dismiss"
      onClick={onDismiss}
      disabled={loading}
      title="Dismiss checklist"
      aria-label="Dismiss checklist"
    >
      ×
    </button>
  );
}
