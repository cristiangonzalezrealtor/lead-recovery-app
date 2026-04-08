"use client";

import { useEffect, useState } from "react";

/**
 * Theme switcher — writes the chosen theme to localStorage under
 * `lr-theme` and sets `data-theme` on <html>. The init script in
 * app/layout.tsx reads the same key before first paint so there's
 * no FOUC.
 */

type Theme = {
  id: string;
  label: string;
  swatch: string; // small gradient preview
};

const THEMES: Theme[] = [
  {
    id: "light",
    label: "Light",
    swatch: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
  },
  {
    id: "dark",
    label: "Dark",
    swatch: "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)",
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  },
  {
    id: "forest",
    label: "Forest",
    swatch: "linear-gradient(135deg, #10b981 0%, #84cc16 100%)",
  },
];

function readCurrentTheme(): string {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") ?? "light";
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<string>("light");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTheme(readCurrentTheme());
  }, []);

  function apply(next: string) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lr-theme", next);
    } catch {
      // ignore — private mode / quota — the session still picks it up
    }
    setTheme(next);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  if (compact) {
    // Compact mode: single button + popover. Fits in the sidebar footer.
    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 12,
          }}
          aria-label="Change theme"
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: 999,
                background: current.swatch,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
              }}
            />
            {current.label}
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </button>

        {open && (
          <>
            {/* click-away */}
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 6,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => apply(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 6,
                    background:
                      t.id === theme ? "var(--accent-soft)" : "transparent",
                    color:
                      t.id === theme ? "var(--accent)" : "var(--ink)",
                    fontSize: 12,
                    fontWeight: t.id === theme ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (t.id !== theme)
                      (e.currentTarget.style.background =
                        "var(--surface-2)");
                  }}
                  onMouseLeave={(e) => {
                    if (t.id !== theme)
                      (e.currentTarget.style.background = "transparent");
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: t.swatch,
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                      flexShrink: 0,
                    }}
                  />
                  {t.label}
                  {t.id === theme && (
                    <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full mode: grid of swatches. Use in settings page.
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => apply(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
              padding: 12,
              border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--ink)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: active ? "var(--shadow)" : "var(--shadow-sm)",
            }}
          >
            <div
              aria-hidden
              style={{
                width: "100%",
                height: 48,
                borderRadius: 6,
                background: t.swatch,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</span>
              {active && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
