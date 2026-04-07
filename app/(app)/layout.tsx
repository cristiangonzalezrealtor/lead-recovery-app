import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.brandProfile) {
    // Force onboarding completion.
    const { redirect } = await import("next/navigation");
    redirect("/setup/welcome");
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/imports", label: "Imports" },
    { href: "/sequences", label: "Sequences" },
    { href: "/revival", label: "Revival" },
    { href: "/integrations", label: "Integrations" },
    { href: "/settings", label: "Settings" },
    { href: "/help", label: "Help" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">LeadRevive AI</div>
        <nav>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
