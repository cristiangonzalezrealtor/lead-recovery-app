"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/onboarding/Stepper";

export default function BrandStep() {
  const router = useRouter();
  const [form, setForm] = useState({
    agentName: "",
    brokerage: "",
    marketCity: "",
    marketState: "",
    tone: "professional",
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    router.push("/setup/upload");
  }

  return (
    <div className="onboard">
      <Stepper current="brand" />
      <h1>Your brand</h1>
      <p className="lede">Used to personalize every email LeadRevive sends on your behalf.</p>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label>Agent name</label>
          <input required value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Brokerage (optional)</label>
          <input value={form.brokerage} onChange={(e) => setForm({ ...form, brokerage: e.target.value })} />
        </div>
        <div className="form-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <label>Market city</label>
            <input value={form.marketCity} onChange={(e) => setForm({ ...form, marketCity: e.target.value })} />
          </div>
          <div>
            <label>State</label>
            <input value={form.marketState} onChange={(e) => setForm({ ...form, marketState: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <label>Tone</label>
          <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="direct">Direct</option>
            <option value="warm">Warm</option>
          </select>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => router.back()}>Back</button>
          <button className="btn primary" type="submit" disabled={loading}>Continue</button>
        </div>
      </form>
    </div>
  );
}
