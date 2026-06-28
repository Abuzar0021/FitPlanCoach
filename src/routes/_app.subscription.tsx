import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { PlanScreenSkeleton } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock, Upload, Globe2, QrCode, Landmark, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentSettings, submitPayment } from "@/lib/payments.functions";
import { createLemonSqueezyCheckout } from "@/lib/lemonsqueezy.functions";

export const Route = createFileRoute("/_app/subscription")({
  head: () => ({ meta: [{ title: "Subscription — FitPlanCoach" }] }),
  component: Subscription,
});

type Interval = "monthly" | "annual";
type Method = "lemon_squeezy" | "qris" | "bank_transfer";

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

function copy(value: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success("Copied"),
    () => toast.error("Could not copy"),
  );
}

function Subscription() {
  const { user } = useAuth();
  const getSettings = useServerFn(getPaymentSettings);
  const submitFn = useServerFn(submitPayment);
  const checkoutFn = useServerFn(createLemonSqueezyCheckout);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [sub, setSub] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [method, setMethod] = useState<Method>("lemon_squeezy");

  // manual-method form state
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function refresh() {
    if (!user) return;
    setErrorMsg(null);
    try {
      const [{ settings, qris_signed_url }, subRes, pendRes] = await Promise.all([
        getSettings(),
        supabase
          .from("subscriptions")
          .select(
            "plan_type,status,current_period_end,billing_interval,payment_method,cancel_at_period_end,renews_at,ends_at",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("payment_submissions")
          .select("id,plan,billing_interval,method,amount_cents,currency,status,submitted_at,review_notes")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setSettings(settings);
      setQrisUrl(qris_signed_url);
      setSub(subRes.data);
      setPending(pendRes.data?.status === "pending" ? pendRes.data : null);
      // Default method: LS if enabled, else QRIS, else bank
      if (settings?.ls_enabled) setMethod("lemon_squeezy");
      else if (settings?.qris_image_path) setMethod("qris");
      else if (settings?.bank_enabled) setMethod("bank_transfer");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not load payment options. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <MobileShell>
        <PlanScreenSkeleton />
      </MobileShell>
    );
  }

  if (errorMsg) {
    return (
      <MobileShell>
        <div className="pt-16 text-center space-y-3">
          <p className="text-sm text-destructive">{errorMsg}</p>
          <Button onClick={refresh} variant="outline" size="sm">Retry</Button>
        </div>
      </MobileShell>
    );
  }

  const monthly = settings?.monthly_price_cents ?? 500;
  const annual = settings?.annual_price_cents ?? 4800;
  const currency = settings?.currency ?? "usd";
  const amount = interval === "monthly" ? monthly : annual;
  const currentPlan = sub?.plan_type ?? "free";
  const isPro = currentPlan !== "free";
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const lsEnabled = !!settings?.ls_enabled && (
    !!settings?.ls_monthly_checkout_url || !!settings?.ls_monthly_variant_id
  );
  const qrisEnabled = !!settings?.qris_image_path;
  const bankEnabled = !!settings?.bank_enabled && !!settings?.bank_account_number;

  async function startLemonSqueezy() {
    setRedirecting(true);
    try {
      const { url } = await checkoutFn({
        data: {
          billing_interval: interval,
          success_redirect: typeof window !== "undefined"
            ? `${window.location.origin}/billing?ls=success`
            : undefined,
        },
      });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout is not available yet. Try QRIS or Bank Transfer.");
      setRedirecting(false);
    }
  }

  async function uploadProof(file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }

  async function onSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (method === "qris" && !proofFile) {
      toast.error("Please upload your QRIS payment proof image.");
      return;
    }
    if (method === "bank_transfer" && !proofFile && !transactionRef.trim()) {
      toast.error("Please upload proof or enter a transfer reference.");
      return;
    }
    setSubmitting(true);
    try {
      let proof_path: string | undefined;
      if (proofFile) proof_path = await uploadProof(proofFile);
      await submitFn({
        data: {
          billing_interval: interval,
          method,
          amount_cents: amount,
          currency,
          transaction_ref: transactionRef.trim() || undefined,
          proof_path,
          user_notes: notes.trim() || undefined,
        },
      });
      toast.success("Payment submitted — awaiting admin review.");
      setProofFile(null);
      setTransactionRef("");
      setNotes("");
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  }

  const availableMethods: Array<{ id: Method; label: string; sub: string; Icon: any; enabled: boolean }> = [
    { id: "lemon_squeezy", label: "Card / PayPal", sub: "International", Icon: Globe2, enabled: lsEnabled },
    { id: "qris", label: "QRIS", sub: "Indonesia", Icon: QrCode, enabled: qrisEnabled },
    { id: "bank_transfer", label: "Bank Transfer", sub: "Indonesia", Icon: Landmark, enabled: bankEnabled },
  ];
  const enabledMethods = availableMethods.filter((m) => m.enabled);

  return (
    <MobileShell>
      <p className="label-overline mb-1">Membership</p>
      <h1 className="text-3xl font-display uppercase italic mb-1">Upgrade to Pro</h1>
      <p className="text-sm text-muted-foreground mb-4">
        International cards activate instantly. QRIS &amp; Bank Transfer are reviewed by our team.
      </p>

      {isPro && (
        <div className="rounded-2xl border border-primary bg-primary/5 p-4 mb-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Current plan</div>
              <div className="font-semibold">
                Pro · {sub?.billing_interval ?? "monthly"}
                {sub?.cancel_at_period_end && <span className="ml-2 text-xs text-warning">(cancels at period end)</span>}
              </div>
            </div>
            {periodEnd && (
              <div className="text-right text-xs text-muted-foreground">
                {sub?.cancel_at_period_end ? "Ends" : "Renews"} {periodEnd.toLocaleDateString()}
              </div>
            )}
          </div>
          <Link to="/billing" className="text-xs underline text-muted-foreground mt-2 inline-block">
            View billing history
          </Link>
        </div>
      )}

      {pending && (
        <div className="rounded-2xl bg-warning/10 border border-warning p-3 text-sm mb-4 flex items-start gap-2">
          <Clock className="size-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Payment under review</div>
            <div className="text-xs text-muted-foreground">
              Your {pending.billing_interval} Pro submission via {pending.method.replace("_", " ").toUpperCase()} for{" "}
              {money(pending.amount_cents, pending.currency)} is awaiting admin approval.
            </div>
          </div>
        </div>
      )}

      {/* Interval picker */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setInterval("monthly")}
          className={`rounded-2xl border p-4 text-left ${interval === "monthly" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          disabled={!!pending}
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pro Monthly</div>
          <div className="text-2xl font-bold mt-1">{money(monthly, currency)}</div>
          <div className="text-xs text-muted-foreground">per month</div>
        </button>
        <button
          onClick={() => setInterval("annual")}
          className={`rounded-2xl border p-4 text-left relative ${interval === "annual" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          disabled={!!pending}
        >
          <span className="absolute -top-2 right-3 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            Best value
          </span>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pro Annual</div>
          <div className="text-2xl font-bold mt-1">{money(annual, currency)}</div>
          <div className="text-xs text-muted-foreground">per year</div>
        </button>
      </div>

      <ul className="text-xs text-muted-foreground space-y-1 mb-5">
        {[
          "Unlimited plan generations",
          "Weekly regeneration & full customization",
          "Progress tracking, streaks & analytics",
          "Priority support",
        ].map((x) => (
          <li key={x} className="flex gap-2">
            <Check className="size-4 text-primary mt-0.5 shrink-0" /> {x}
          </li>
        ))}
      </ul>

      {!pending && enabledMethods.length === 0 && (
        <div className="rounded-2xl border border-warning bg-warning/10 p-4 text-sm">
          No payment methods are configured yet. Please contact{" "}
          <a href="mailto:support@fitplancoach.com" className="underline">support</a>.
        </div>
      )}

      {!pending && enabledMethods.length > 0 && (
        <>
          {/* Method picker */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {enabledMethods.map((m) => {
              const active = method === m.id;
              const Icon = m.Icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-2xl border p-3 text-left ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <Icon className="size-4 mb-1" />
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Lemon Squeezy redirect */}
          {method === "lemon_squeezy" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                You'll be redirected to a secure checkout. Pro access activates automatically after
                successful payment — no admin review needed.
              </div>
              <Button onClick={startLemonSqueezy} disabled={redirecting} className="w-full h-11">
                {redirecting ? "Redirecting…" : (
                  <span className="inline-flex items-center gap-2">
                    <ExternalLink className="size-4" /> Pay {money(amount, currency)} ({interval})
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* QRIS */}
          {method === "qris" && (
            <form onSubmit={onSubmitManual} className="space-y-3">
              <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground space-y-2">
                {qrisUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrisUrl} alt="QRIS code" className="max-w-[220px] rounded-lg bg-white p-2" />
                    <p className="text-center">
                      Scan and pay <span className="font-semibold text-foreground">{money(amount, currency)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-warning-foreground">QRIS code is not configured yet.</p>
                )}
                {settings?.qris_instructions && <p className="whitespace-pre-line">{settings.qris_instructions}</p>}
                <p>Upload a screenshot of your payment confirmation below.</p>
              </div>
              <div>
                <Label htmlFor="proof">Payment proof image *</Label>
                <label htmlFor="proof" className="mt-1 flex items-center gap-2 rounded-xl border-2 border-dashed border-border p-3 cursor-pointer hover:bg-muted text-sm">
                  <Upload className="size-4" />
                  {proofFile ? proofFile.name : "Choose an image"}
                </label>
                <Input id="proof" type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label htmlFor="tref">Transaction reference (optional)</Label>
                <Input id="tref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
              </div>
              <ManualNotes notes={notes} setNotes={setNotes} />
              <Button type="submit" disabled={submitting} className="w-full h-11">
                {submitting ? "Submitting…" : `Submit ${interval} payment`}
              </Button>
            </form>
          )}

          {/* Bank Transfer */}
          {method === "bank_transfer" && (
            <form onSubmit={onSubmitManual} className="space-y-3">
              <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground space-y-2">
                <p>
                  Transfer <span className="font-semibold text-foreground">{money(amount, currency)}</span> to:
                </p>
                <div className="bg-background rounded-xl p-3 space-y-1.5 text-foreground">
                  {settings?.bank_name && <Row label="Bank" value={settings.bank_name} />}
                  {settings?.bank_account_holder && <Row label="Account holder" value={settings.bank_account_holder} />}
                  {settings?.bank_account_number && <Row label="Account #" value={settings.bank_account_number} copyable />}
                  {settings?.bank_va_number && <Row label="Virtual account" value={settings.bank_va_number} copyable />}
                </div>
                {settings?.bank_instructions && <p className="whitespace-pre-line">{settings.bank_instructions}</p>}
                <p>Upload a transfer receipt or enter your transaction reference below.</p>
              </div>
              <div>
                <Label htmlFor="bproof">Transfer proof (image)</Label>
                <label htmlFor="bproof" className="mt-1 flex items-center gap-2 rounded-xl border-2 border-dashed border-border p-3 cursor-pointer hover:bg-muted text-sm">
                  <Upload className="size-4" />
                  {proofFile ? proofFile.name : "Choose an image (optional if reference provided)"}
                </label>
                <Input id="bproof" type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label htmlFor="btref">Transfer reference</Label>
                <Input id="btref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g. bank reference / VA confirmation" />
              </div>
              <ManualNotes notes={notes} setNotes={setNotes} />
              <Button type="submit" disabled={submitting} className="w-full h-11">
                {submitting ? "Submitting…" : `Submit ${interval} payment`}
              </Button>
            </form>
          )}

          {method !== "lemon_squeezy" && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Pro access is activated <span className="font-semibold">only after our team approves your payment</span>.
              Typical review time: under 24 hours.
            </p>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground mt-5 text-center">
        <Link to="/billing" className="underline">Billing history</Link> ·{" "}
        <Link to="/profile" className="underline">Back to profile</Link>
      </p>
    </MobileShell>
  );
}

function Row({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold inline-flex items-center gap-2 truncate">
        {value}
        {copyable && (
          <button type="button" onClick={() => copy(value)} className="text-muted-foreground hover:text-foreground" aria-label="Copy">
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

function ManualNotes({ notes, setNotes }: { notes: string; setNotes: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="notes">Notes for our team (optional)</Label>
      <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
    </div>
  );
}
