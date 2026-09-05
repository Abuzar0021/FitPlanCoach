import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Utensils, Dumbbell, LineChart, User } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/meals", label: "Meals", icon: Utensils },
  { to: "/workouts", label: "Train", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  return (
    <div className="min-h-screen bg-background flex flex-col mx-auto max-w-md w-full relative">
      <main className="flex-1 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <nav aria-label="Primary" className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-md px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-auto">
          <div className="glass rounded-2xl flex items-center justify-between px-2 py-2 shadow-[var(--shadow-card-lg)]">
            {TABS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`relative inline-flex ${active ? "scale-110" : ""} transition-transform`}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.6 : 2} />
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                    )}
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
