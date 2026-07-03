import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

// Website CMS — a route tree entirely separate from /admin (the mobile-app
// admin: Foods/Exercises/Workouts/Users/Support/Settings/Analytics). Its
// only purpose is publishing blog content. It shares no layout, nav, or
// components with /admin — see src/components/cms/*.
//
// Sign-in itself reuses the site's one existing account/auth system
// (Supabase Auth, the same login used everywhere else on fitplancoach.com)
// gated on the same staff role already required to write blog_posts under
// RLS — this is not the mobile app's authentication, just the same login
// screen every account uses, scoped by the role that already governs every
// blog write.
export const Route = createFileRoute("/cms")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "owner");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },
  component: CmsLayout,
});

const NAV = [
  { to: "/cms", label: "Dashboard", exact: true },
  { to: "/cms/articles", label: "Articles", exact: false },
  { to: "/cms/categories", label: "Categories", exact: false },
  { to: "/cms/tags", label: "Tags", exact: false },
  { to: "/cms/media", label: "Media", exact: false },
] as const;

function CmsLayout() {
  const { location } = useRouterState();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="size-9 rounded-lg hover:bg-muted inline-flex items-center justify-center"
              aria-label="Back to app"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Logo size="sm" />
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-semibold">
              Website CMS
            </span>
          </div>
        </div>
        <nav
          aria-label="Website CMS sections"
          className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto"
        >
          {NAV.map((n) => {
            const active = n.exact
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition inline-flex items-center gap-1.5 ${
                  active
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
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
