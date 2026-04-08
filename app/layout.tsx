import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadRevive AI",
  description: "The lead recovery system that tells solo real estate agents who to call today. Recover deals hiding in your database.",
};

// Inline script — runs before first paint so the user never sees a
// light-mode flash before dark theme kicks in. Reads from localStorage
// and falls back to the OS-level prefers-color-scheme.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var saved = localStorage.getItem('lr-theme');
    var theme = saved;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
