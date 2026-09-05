import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpUser, confirmUserByEmail } from "@/lib/auth.functions";
import { isAndroidApp } from "@/lib/billing";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    // Local path only (defends against open-redirect via a crafted query string).
    redirect: z
      .string()
      .regex(/^\/[^/].*$|^\/$/)
      .optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create your account — FitPlanCoach" },
      {
        name: "description",
        content:
          "Sign in to FitPlanCoach or create a free account to start your personalized meal and workout plan. No credit card required.",
      },
      { property: "og:title", content: "Sign in to FitPlanCoach" },
      {
        property: "og:description",
        content:
          "Access your personalized fitness coaching dashboard or create a free FitPlanCoach account.",
      },
      { property: "og:url", content: "https://fitplancoach.com/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  // Inside the Android shell there is no marketing site to go "back" to —
  // "/" redirects straight back here. Detected after mount so the server
  // render and the first client render agree (no hydration mismatch).
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isAndroidApp()), []);
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const redirectTo = redirect ?? "/dashboard";
  const doSignUp = useServerFn(signUpUser);
  const doConfirm = useServerFn(confirmUserByEmail);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast.error(`Too many attempts. Try again in ${secs}s.`);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        // Create the user already email-confirmed (server-side, service role), so
        // no verification email is needed and the account works immediately.
        const res = await doSignUp({ data: { email: cleanEmail, password, name: name.trim() } });
        if (!res.ok) {
          if (res.reason === "exists") {
            toast.error("That email is already registered — try signing in.");
            setMode("signin");
            return;
          }
          throw new Error(res.message || "Could not create your account. Please try again.");
        }
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInErr) throw signInErr;
        toast.success("Welcome to FitPlanCoach!");
        navigate({ to: redirectTo });
      } else {
        let { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        // Legacy accounts created before auto-confirm fail with "Email not
        // confirmed". The correct password was accepted, so confirm + retry once.
        if (error && /not confirmed|confirm/i.test(error.message)) {
          const c = await doConfirm({ data: { email: cleanEmail } });
          if (c.ok) {
            ({ error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password }));
          }
        }
        if (error) {
          const next = attempts + 1;
          setAttempts(next);
          if (next >= 5) {
            setLockedUntil(Date.now() + 60_000);
            setAttempts(0);
            toast.error("Too many failed attempts. Locked for 60s.");
            return;
          }
          throw error;
        }
        setAttempts(0);
        toast.success("Welcome back");
        navigate({ to: redirectTo });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Logo size="lg" />
          <h1 className="text-2xl font-display uppercase italic mt-5">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {mode === "signin"
              ? "Sign in to pick up your plan and progress."
              : "Free to start — your plan is ready in minutes."}
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-[var(--shadow-card-lg)]">
          <div
            className="flex gap-2 mb-6 p-1 bg-muted rounded-xl"
            role="tablist"
            aria-label="Authentication mode"
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                disabled={loading}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                  mode === m
                    ? "bg-card shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  autoFocus
                  autoComplete="name"
                  autoCapitalize="words"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus={mode === "signin"}
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={mode === "signup" ? 8 : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-[11px] text-muted-foreground">
                  At least 8 characters. Your account is ready right away.
                </p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 text-base">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Please wait…
                </>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
            {mode === "signup" && (
              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy Notice
                </Link>
                .
              </p>
            )}
          </form>
        </div>
        {!inApp && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:text-foreground">
              ← Back
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
