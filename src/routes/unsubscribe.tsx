import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe — FitPlanCoach" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

type State = "loading" | "valid" | "invalid" | "already" | "confirming" | "done" | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) {
          setState("invalid");
          return;
        }
        const d = await r.json();
        if (d.valid === false && d.reason === "already_unsubscribed") setState("already");
        else if (d.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, []);

  async function confirm() {
    if (!token) return;
    setState("confirming");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success) setState("done");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 py-4 flex justify-center">
          <Logo />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="surface-card p-8 max-w-md w-full text-center">
          {state === "loading" && (
            <>
              <Loader2 className="size-10 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-display uppercase italic">Checking your link…</h1>
            </>
          )}
          {state === "valid" && (
            <>
              <h1 className="text-2xl font-display uppercase italic mb-3">Unsubscribe?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                You'll stop receiving emails from FitPlanCoach. You can still sign in and use your
                account normally.
              </p>
              <Button onClick={confirm} className="w-full mb-2">
                Confirm unsubscribe
              </Button>
              <a href="/" className="text-xs text-muted-foreground hover:text-foreground underline">
                Keep my emails
              </a>
            </>
          )}
          {state === "confirming" && (
            <>
              <Loader2 className="size-10 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-display uppercase italic">Unsubscribing…</h1>
            </>
          )}
          {state === "done" && (
            <>
              <CheckCircle2 className="size-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-display uppercase italic mb-2">You're unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                We won't email you anymore. Change your mind? Reach{" "}
                <a href="mailto:abuzarelahi01@gmail.com" className="text-primary underline">
                  abuzarelahi01@gmail.com
                </a>
                .
              </p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle2 className="size-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-display uppercase italic mb-2">Already unsubscribed</h1>
              <p className="text-sm text-muted-foreground">This address is already off our list.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl font-display uppercase italic mb-2">Link not valid</h1>
              <p className="text-sm text-muted-foreground">
                This unsubscribe link is invalid or expired. Email{" "}
                <a href="mailto:abuzarelahi01@gmail.com" className="text-primary underline">
                  abuzarelahi01@gmail.com
                </a>{" "}
                and we'll unsubscribe you manually.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
