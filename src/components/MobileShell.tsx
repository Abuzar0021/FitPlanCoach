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

/**
 * The developer bay. Everything a signed-in user sees sits under one amber
 * safelight, and the tab bar is the enamel lip of the tray — a lit edge the
 * content rests against, not a floating card. The live station is struck by
 * the safelight; the others stay in the print's mid-greys, present but unlit.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  return (
    <div className="darkroom darkroom-bay min-h-screen flex flex-col mx-auto max-w-md w-full relative">
      <main className="flex-1 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md"
      >
        {/* The tray lip: one enamel hairline catching the safelight. */}
        <div
          aria-hidden
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(to right, transparent, oklch(0.94 0.006 80 / 0.30) 18%, oklch(0.722 0.165 62 / 0.55) 50%, oklch(0.94 0.006 80 / 0.30) 82%, transparent)",
          }}
        />
        <div
          className="flex items-stretch justify-between px-2 pt-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.128 0.020 48 / 0.94), oklch(0.104 0.018 52))",
            backdropFilter: "blur(10px)",
          }}
        >
          {TABS.map(({ to, label, icon: Icon }) => {
            const active =
              location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className="flex-1 flex flex-col items-center gap-1.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200"
                style={{
                  color: active ? "var(--safelight)" : "var(--print-emerging)",
                }}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2.2 : 1.6}
                  style={
                    active
                      ? {
                          filter:
                            "drop-shadow(0 0 10px oklch(0.722 0.165 62 / 0.55))",
                        }
                      : undefined
                  }
                />
                {label}
                {/* The exposure mark under the live station. */}
                <span
                  aria-hidden
                  className="h-px w-5 transition-opacity duration-200"
                  style={{
                    background: "var(--safelight)",
                    opacity: active ? 1 : 0,
                    boxShadow: active
                      ? "0 0 8px oklch(0.722 0.165 62 / 0.8)"
                      : undefined,
                  }}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
