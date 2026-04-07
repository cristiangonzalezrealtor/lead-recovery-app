import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadRevive AI",
  description: "The lead recovery system that tells solo real estate agents who to call today. Recover deals hiding in your database.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
