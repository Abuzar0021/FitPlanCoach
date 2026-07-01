import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { PlanScreenSkeleton } from "@/components/app-ui";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { Button } from "@/components/ui/button";
import { Check, Crown, ExternalLink, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { planLabel, isPro as isProPlan, type PlanContext } from "@/lib/access";
import {
  isAndroidApp,
  startProPurchase,
  restorePurchases,
  PLAY_MANAGE_URL,
  type PlanInterval,
} from "@/lib/billing";

export const Route = createFileRoute("/_app/subscription")({
  head: () => ({ meta: [{ title: "Subscription — FitPlanCoach" }] }),
  component: Subscription,
});

type SubRow = PlanContext & {
  cancel_at_period_end?: boolean | null;
  renews_at?: string | null;
  ends_at?: string | null;
};

const PRO_PERKS = [
  "Unlimited AI-generated plans",
  "Weekly meal & workout refresh",
  "Full meal customization — swap any item",
  "Advanced progress charts & analytics",
  "Priority support",
];

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function Subscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [busy, setBusy] = useState<PlanInterval | "restore" | null>(null);

  async function refresh() {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "plan_type,status,current_period_end,billing_interval,cancel_at_period_end,renews_at,ends_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setSub((data as SubRow) ?? { plan_type: "free" });
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function upgrade(interval: PlanInterval) {
    setBusy(interval);
    try {
      const res = await startProPurchase(interval);
      if (res.ok) {
        toast.success("Purchase complete — unlocking Pro…");
        await refresh();
      } else if (res.reason === "unavailable_on_web") {
        toast.info("Premium is purchased inside the Android app via Google Play.");
      } else {
        toast.error(res.message ?? "Purchase could not be completed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("restore");
    try {
      const res = await restorePurchases();
      if (res.ok) {
        toast.success("Purchases restored.");
        await refresh();
      } else if (res.reason === "unavailable_on_web") {
        toast.info("Restore is available inside the Android app.");
      } else {
        toast.error(res.message ?? "Nothing to restore.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <MobileShell>
        <PlanScreenSkeleton />
      </MobileShell>
    );
  }

  const pro = sub ? isProPlan(sub) : false;
  const label = sub ? planLabel(sub) : "Free";
  const renews = fmtDate(sub?.renews_at ?? sub?.current_period_end);
  const ends = fmtDate(sub?.ends_at);
  const android = isAndroidApp();

  return (
    <MobileShell>
      <p className="label-overline mb-1">Account</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Subscription</h1>

      {/* Current status */}
      <section className="surface-card p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-overline">Current plan</p>
            <p className="text-2xl font-display italic mt-0.5">{label}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              pro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {pro && <Crown className="size-3" />} {pro ? "Active" : "Free"}
          </span>
        </div>
        {pro && (
          <p className="text-xs text-muted-foreground mt-3">
            {sub?.cancel_at_period_end
              ? `Your plan ends on ${ends ?? renews ?? "your renewal date"} — you'll keep Pro until then.`
              : renews
                ? `Renews on ${renews}.`
                : "Your Pro plan is active."}
          </p>
        )}
      </section>

      {pro ? (
        /* Manage existing subscription via Google Play */
        <a href={PLAY_MANAGE_URL} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full justify-between h-12 border-border-strong">
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="size-4" /> Manage or cancel in Google Play
            </span>
            <ExternalLink className="size-4 text-muted-foreground" />
          </Button>
        </a>
      ) : (
        /* Upgrade path */
        <>
          <section className="surface-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="size-4 text-primary" />
              <h2 className="font-display uppercase italic text-lg">FitPlanCoach Pro</h2>
            </div>
            <ul className="space-y-2.5">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <Check className="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>

          {android ? (
            <div className="space-y-2.5">
              <Button
                className="w-full h-12 font-bold uppercase tracking-wider"
                disabled={busy !== null}
                onClick={() => upgrade("monthly")}
              >
                {busy === "monthly" ? "Opening Google Play…" : "Go Pro — $5 / month"}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 font-bold uppercase tracking-wider border-border-strong"
                disabled={busy !== null}
                onClick={() => upgrade("annual")}
              >
                {busy === "annual"
                  ? "Opening Google Play…"
                  : "Go Pro Annual — $50 / year (2 months free)"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-1">
                Billed securely through Google Play. Cancel anytime.
              </p>
            </div>
          ) : (
            /* Web: premium is sold only in the app */
            <div className="surface-card p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Premium is purchased securely through Google Play, inside the FitPlanCoach Android
                app.
              </p>
              <div className="mt-4 flex justify-center">
                <GooglePlayButton size="lg" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Restore */}
      <button
        onClick={restore}
        disabled={busy !== null}
        className="mt-5 w-full text-center text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition disabled:opacity-50"
      >
        {busy === "restore" ? "Restoring…" : "Restore purchases"}
      </button>
    </MobileShell>
  );
}
