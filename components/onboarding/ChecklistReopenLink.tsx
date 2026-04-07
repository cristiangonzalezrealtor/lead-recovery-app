"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChecklistReopenLink({
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      className="btn"
      onClick={onReopen}
      disabled={loading}
      style={{ width: "fit-content" }}
    >
      Setup progress ({done}/{total})
    </button>
  );
}
