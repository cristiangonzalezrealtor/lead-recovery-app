import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

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
      <aside
        className="sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="brand">LeadRevive AI</div>
        <nav style={{ flex: 1 }}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <div
          style={{
            paddingTop: 16,
            marginTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-mute)",
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Theme
          </div>
          <ThemeSwitcher compact />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
