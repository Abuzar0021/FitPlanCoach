import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing history — FitPlanCoach" }] }),
  component: Billing,
});

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

function Billing() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: h }, { data: s }] = await Promise.all([
        supabase
          .from("billing_history")
          .select("id, plan, billing_interval, method, amount_cents, currency, period_start, period_end, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_submissions")
          .select("id, billing_interval, method, amount_cents, currency, status, submitted_at, reviewed_at, review_notes")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(20),
      ]);
      setHistory(h ?? []);
      setSubs(s ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <MobileShell>
      <h1 className="text-2xl mb-4">Billing & history</h1>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Paid periods
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No paid periods yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="metric-card">
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="font-semibold capitalize">
                      Pro · {h.billing_interval}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.period_start).toLocaleDateString()} →{" "}
                      {new Date(h.period_end).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(h.amount_cents, h.currency)}</div>
                    <div className="text-xs text-muted-foreground uppercase">{h.method}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Submissions
        </h2>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="metric-card">
                <div className="flex justify-between text-sm items-baseline">
                  <div>
                    <div className="font-semibold capitalize">
                      {s.billing_interval} · {s.method.toUpperCase()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.submitted_at).toLocaleString()}
                    </div>
                    {s.review_notes && (
                      <div className="text-xs italic text-muted-foreground mt-1">"{s.review_notes}"</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(s.amount_cents, s.currency)}</div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                        s.status === "approved"
                          ? "bg-primary/10 text-primary"
                          : s.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : s.status === "expired"
                              ? "bg-muted text-muted-foreground"
                              : "bg-warning/10 text-warning-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground text-center">
        <Link to="/subscription" className="underline">Back to subscription</Link>
      </p>
    </MobileShell>
  );
}
