import { createFileRoute, redirect, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "owner");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },

  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/payment-settings", label: "Payment settings" },
  { to: "/admin/support", label: "Support" },
  { to: "/admin/foods", label: "Foods" },
  { to: "/admin/exercises", label: "Exercises" },
  { to: "/admin/workouts", label: "Workouts" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/settings", label: "Settings" },
] as const;


function AdminLayout() {
  const { location } = useRouterState();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate({ to: "/dashboard" })} className="size-9 rounded-lg hover:bg-muted inline-flex items-center justify-center"><ArrowLeft className="size-4" /></button>
            <Logo size="sm" />
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-semibold">Admin</span>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV.map(n => {
            const active = location.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{n.label}</Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}
