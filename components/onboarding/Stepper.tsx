export const STEPS = [
  { slug: "welcome", label: "Welcome" },
  { slug: "brand", label: "Brand" },
  { slug: "upload", label: "Upload" },
  { slug: "review-import", label: "Review" },
  { slug: "nurture-defaults", label: "Nurture" },
  { slug: "sequence-defaults", label: "Sequences" },
  { slug: "integrations", label: "Connect" },
  { slug: "launch", label: "Launch" },
] as const;

export function Stepper({ current }: { current: (typeof STEPS)[number]["slug"] }) {
  const idx = STEPS.findIndex((s) => s.slug === current);
  return (
    <div className="steps">
      {STEPS.map((s, i) => (
        <div key={s.slug} className={`dot ${i <= idx ? "active" : ""}`} />
      ))}
    </div>
  );
}
