import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FitPlanCoach" },
      { name: "description", content: "Reset your FitPlanCoach account password securely." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for a reset link");
    } catch {
      // Don't reveal whether the email exists — always show the same success state
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Logo size="lg" />
          <h1 className="text-2xl font-display uppercase italic mt-5">Reset your password</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            We'll email you a secure link to set a new one.
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-[var(--shadow-card-lg)]">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="size-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center">
                <MailCheck className="size-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{email}</span>, we've sent a password
                reset link. The link expires in 1 hour.
              </p>
              <Link
                to="/auth"
                className="inline-block text-sm underline mt-2 hover:text-foreground"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the email tied to your account and we'll send a reset link.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
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
              <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="hover:text-foreground">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
