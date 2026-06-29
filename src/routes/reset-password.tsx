import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertTriangle, Check } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Set a new password — FitPlanCoach" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase processes the recovery hash automatically and emits PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValidSession(true);
      }
      setReady(true);
    });
    // Also check current session in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Logo size="lg" />
          <h1 className="text-2xl font-display uppercase italic mt-5">Set a new password</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Choose a strong password you'll remember.
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-[var(--shadow-card-lg)]">
          {!ready ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Verifying reset link…
            </p>
          ) : !validSession ? (
            <div className="text-center space-y-3">
              <div className="size-14 mx-auto rounded-2xl bg-warning/10 border border-warning/20 inline-flex items-center justify-center">
                <AlertTriangle className="size-6 text-warning" />
              </div>
              <h2 className="text-lg font-semibold">Reset link invalid or expired</h2>
              <p className="text-sm text-muted-foreground">
                Request a new password reset link to continue.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block text-sm underline mt-2 hover:text-foreground"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
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
                <p
                  className={`text-[11px] flex items-center gap-1 ${password.length >= 8 ? "text-primary" : "text-muted-foreground"}`}
                >
                  {password.length >= 8 && <Check className="size-3" />} At least 8 characters
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                {confirm.length > 0 && (
                  <p
                    className={`text-[11px] flex items-center gap-1 ${password === confirm ? "text-primary" : "text-warning"}`}
                  >
                    {password === confirm ? (
                      <>
                        <Check className="size-3" /> Passwords match
                      </>
                    ) : (
                      "Passwords don't match yet"
                    )}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading || password.length < 8 || password !== confirm}
                className="w-full h-11 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
