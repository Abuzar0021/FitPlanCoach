import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  getPaymentSettings,
  updatePaymentSettings,
  uploadQrisImage,
} from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/payment-settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const isOwner = (roles ?? []).some((r) => r.role === "owner");
    if (!isOwner) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Payment settings — Admin" }] }),
  component: PaymentSettings,
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function PaymentSettings() {
  const getFn = useServerFn(getPaymentSettings);
  const updateFn = useServerFn(updatePaymentSettings);
  const uploadFn = useServerFn(uploadQrisImage);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);

  // Pricing
  const [monthly, setMonthly] = useState("5.00");
  const [annual, setAnnual] = useState("48.00");
  const [currency, setCurrency] = useState("usd");

  // PayPal (legacy, optional)
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalInstructions, setPaypalInstructions] = useState("");

  // QRIS
  const [qrisInstructions, setQrisInstructions] = useState("");

  // Bank
  const [bankEnabled, setBankEnabled] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankVa, setBankVa] = useState("");
  const [bankInstructions, setBankInstructions] = useState("");

  // Lemon Squeezy
  const [lsEnabled, setLsEnabled] = useState(false);
  const [lsStoreId, setLsStoreId] = useState("");
  const [lsMonthlyVariant, setLsMonthlyVariant] = useState("");
  const [lsAnnualVariant, setLsAnnualVariant] = useState("");
  const [lsMonthlyUrl, setLsMonthlyUrl] = useState("");
  const [lsAnnualUrl, setLsAnnualUrl] = useState("");

  const [paymentInstructions, setPaymentInstructions] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { settings, qris_signed_url } = await getFn();
      if (settings) {
        setMonthly((settings.monthly_price_cents / 100).toFixed(2));
        setAnnual((settings.annual_price_cents / 100).toFixed(2));
        setCurrency(settings.currency);
        setPaypalEmail(settings.paypal_email ?? "");
        setPaypalInstructions(settings.paypal_instructions ?? "");
        setQrisInstructions(settings.qris_instructions ?? "");
        setPaymentInstructions(settings.payment_instructions ?? "");
        setBankEnabled(!!settings.bank_enabled);
        setBankName(settings.bank_name ?? "");
        setBankHolder(settings.bank_account_holder ?? "");
        setBankAccount(settings.bank_account_number ?? "");
        setBankVa(settings.bank_va_number ?? "");
        setBankInstructions(settings.bank_instructions ?? "");
        setLsEnabled(!!settings.ls_enabled);
        setLsStoreId(settings.ls_store_id ?? "");
        setLsMonthlyVariant(settings.ls_monthly_variant_id ?? "");
        setLsAnnualVariant(settings.ls_annual_variant_id ?? "");
        setLsMonthlyUrl(settings.ls_monthly_checkout_url ?? "");
        setLsAnnualUrl(settings.ls_annual_checkout_url ?? "");
      }
      setQrisUrl(qris_signed_url);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFn({
        data: {
          monthly_price_cents: Math.round(parseFloat(monthly) * 100),
          annual_price_cents: Math.round(parseFloat(annual) * 100),
          currency: currency.trim().toLowerCase(),
          paypal_email: paypalEmail.trim() || null,
          paypal_instructions: paypalInstructions.trim() || null,
          qris_instructions: qrisInstructions.trim() || null,
          payment_instructions: paymentInstructions.trim() || null,
          // Bank
          bank_enabled: bankEnabled,
          bank_name: bankName.trim() || null,
          bank_account_holder: bankHolder.trim() || null,
          bank_account_number: bankAccount.trim() || null,
          bank_va_number: bankVa.trim() || null,
          bank_instructions: bankInstructions.trim() || null,
          // LS
          ls_enabled: lsEnabled,
          ls_store_id: lsStoreId.trim() || null,
          ls_monthly_variant_id: lsMonthlyVariant.trim() || null,
          ls_annual_variant_id: lsAnnualVariant.trim() || null,
          ls_monthly_checkout_url: lsMonthlyUrl.trim() || null,
          ls_annual_checkout_url: lsAnnualUrl.trim() || null,
        },
      });
      toast.success("Settings saved");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onQrisUpload(file: File) {
    if (file.size > 4_000_000) {
      toast.error("File too large (max 4 MB).");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await uploadFn({
        data: { filename: file.name, content_type: file.type || "image/png", base64 },
      });
      toast.success("QRIS image updated");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Payment settings</h1>
        <p className="text-sm text-muted-foreground">
          Owner-only. Configure prices and every payment method. Disabled methods are hidden from users.
        </p>
      </div>

      {/* Pricing */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="monthly">Monthly price</Label>
            <Input id="monthly" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="annual">Annual price</Label>
            <Input id="annual" inputMode="decimal" value={annual} onChange={(e) => setAnnual(e.target.value)} required />
          </div>
          <div className="col-span-2">
            <Label htmlFor="cur">Currency</Label>
            <Input id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={6} required />
            <p className="text-xs text-muted-foreground mt-1">ISO code (e.g. usd, idr, eur).</p>
          </div>
        </div>
      </section>

      {/* Lemon Squeezy */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Lemon Squeezy (International)</h2>
            <p className="text-xs text-muted-foreground">Card &amp; PayPal. Pro activates automatically via webhook.</p>
          </div>
          <Switch checked={lsEnabled} onCheckedChange={setLsEnabled} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Store ID</Label>
            <Input value={lsStoreId} onChange={(e) => setLsStoreId(e.target.value)} placeholder="414930" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly variant ID</Label>
              <Input value={lsMonthlyVariant} onChange={(e) => setLsMonthlyVariant(e.target.value)} placeholder="e.g. 123456" />
            </div>
            <div>
              <Label>Annual variant ID</Label>
              <Input value={lsAnnualVariant} onChange={(e) => setLsAnnualVariant(e.target.value)} placeholder="e.g. 123457" />
            </div>
          </div>
          <div>
            <Label>Monthly checkout URL (fallback)</Label>
            <Input value={lsMonthlyUrl} onChange={(e) => setLsMonthlyUrl(e.target.value)} placeholder="https://yourstore.lemonsqueezy.com/buy/..." />
          </div>
          <div>
            <Label>Annual checkout URL (fallback)</Label>
            <Input value={lsAnnualUrl} onChange={(e) => setLsAnnualUrl(e.target.value)} placeholder="https://yourstore.lemonsqueezy.com/buy/..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Webhook endpoint: <span className="font-mono">/api/public/lemonsqueezy/webhook</span>. Configure it in Lemon Squeezy and store the signing secret in project secrets as <span className="font-mono">LEMONSQUEEZY_WEBHOOK_SECRET</span>.
          </p>
        </div>
      </section>

      {/* QRIS */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">QRIS (Indonesia)</h2>
        {qrisUrl ? (
          <img src={qrisUrl} alt="Current QRIS" className="max-w-[220px] rounded-lg bg-white p-2" />
        ) : (
          <p className="text-xs text-muted-foreground">No QRIS image uploaded yet.</p>
        )}
        <label htmlFor="qrisup" className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border p-3 cursor-pointer hover:bg-muted text-sm w-fit">
          <Upload className="size-4" />
          {uploading ? "Uploading…" : qrisUrl ? "Replace QRIS image" : "Upload QRIS image"}
        </label>
        <Input id="qrisup" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onQrisUpload(f); }} />
        <div>
          <Label>Instructions shown to customer</Label>
          <Textarea rows={3} value={qrisInstructions} onChange={(e) => setQrisInstructions(e.target.value)} maxLength={2000} />
        </div>
      </section>

      {/* Bank Transfer */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Bank Transfer / Virtual Account (Indonesia)</h2>
            <p className="text-xs text-muted-foreground">Manual review by Owner/Admin.</p>
          </div>
          <Switch checked={bankEnabled} onCheckedChange={setBankEnabled} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Bank name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Bank Mandiri / BCA" />
          </div>
          <div className="col-span-2">
            <Label>Account holder</Label>
            <Input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
          </div>
          <div>
            <Label>Account number</Label>
            <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </div>
          <div>
            <Label>Virtual account number</Label>
            <Input value={bankVa} onChange={(e) => setBankVa(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Instructions</Label>
            <Textarea rows={3} value={bankInstructions} onChange={(e) => setBankInstructions(e.target.value)} maxLength={2000} />
          </div>
        </div>
      </section>

      {/* Legacy PayPal */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">PayPal (legacy manual)</h2>
        <p className="text-xs text-muted-foreground">Optional — only kept for backward compatibility. Prefer Lemon Squeezy.</p>
        <div>
          <Label>PayPal receiving email</Label>
          <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} />
        </div>
        <div>
          <Label>Instructions</Label>
          <Textarea rows={2} value={paypalInstructions} onChange={(e) => setPaypalInstructions(e.target.value)} maxLength={2000} />
        </div>
      </section>

      {/* General notes */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">General payment notes</h2>
        <Textarea rows={3} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} maxLength={2000} />
      </section>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
