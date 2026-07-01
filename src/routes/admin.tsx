import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "owner");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },

  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/media", label: "Media" },
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
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .then(({ count }) => setOpenTickets(count ?? 0));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="size-9 rounded-lg hover:bg-muted inline-flex items-center justify-center"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Logo size="sm" />
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-semibold">
              Admin
            </span>
          </div>
        </div>
        <nav
          aria-label="Admin sections"
          className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto"
        >
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition inline-flex items-center gap-1.5 ${active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {n.label}
                {n.to === "/admin/support" && openTickets > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {openTickets}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
