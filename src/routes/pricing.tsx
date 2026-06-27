import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — FitPlanCoach" },
      { name: "description", content: "Start free. Upgrade to Pro for unlimited personalized plans, weekly regeneration, and advanced progress tracking. Cancel anytime." },
      { property: "og:title", content: "FitPlanCoach Pricing — Free, Pro Monthly, Pro Annual" },
      { property: "og:description", content: "Pro from $5/mo. Cancel anytime. 30-day money-back guarantee." },
      { property: "og:url", content: "https://fitplancoach.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "FitPlanCoach Subscription",
          description: "Personalized meal plans, adaptive workouts, and progress tracking.",
          brand: { "@type": "Brand", name: "FitPlanCoach" },
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", url: "https://fitplancoach.com/pricing", availability: "https://schema.org/InStock" },
            { "@type": "Offer", name: "Pro", price: "5", priceCurrency: "USD", url: "https://fitplancoach.com/pricing", availability: "https://schema.org/InStock" },
            { "@type": "Offer", name: "Premium", price: "10", priceCurrency: "USD", url: "https://fitplancoach.com/pricing", availability: "https://schema.org/InStock" },
            { "@type": "Offer", name: "Elite", price: "15", priceCurrency: "USD", url: "https://fitplancoach.com/pricing", availability: "https://schema.org/InStock" },
          ],
        }),
      },
    ],
  }),
  component: PricingPage,
});

const FREE_PERKS = [
  "1 personalized plan",
  "Weight & progress tracking",
  "Workout & meal preview",
  "Basic dashboard",
];

const PRO_PERKS = [
  "Unlimited plan regeneration",
  "Weekly meal & workout refresh",
  "Full progress charts & streaks",
  "Achievements & badges",
  "Priority support",
  "30-day money-back guarantee",
];

function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/auth"><Button size="sm" className="font-bold uppercase tracking-wide">Sign in</Button></Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl px-6 py-16 w-full">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
            <Zap className="size-3" fill="currentColor" /> Simple, honest pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight">Choose your plan</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, no credit card required. Upgrade to Pro when you're ready for unlimited personalized plans. Cancel anytime in one click.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="surface-card p-6 flex flex-col">
            <h2 className="text-xl font-display uppercase italic">Free</h2>
            <p className="text-sm text-muted-foreground mt-1">Try the platform</p>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-display tabular-nums">$0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm flex-1">
              {FREE_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="mt-6">
              <Button className="w-full" variant="outline">Get started free</Button>
            </Link>
          </div>

          {/* Pro Monthly — recommended */}
          <div className="surface-card p-6 flex flex-col border-primary relative shadow-[var(--shadow-lime)]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
              Most popular
            </span>
            <h2 className="text-xl font-display uppercase italic">Pro Monthly</h2>
            <p className="text-sm text-muted-foreground mt-1">Flexibility, paid monthly</p>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-display tabular-nums">$5</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm flex-1">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="mt-6">
              <Button className="w-full">Start Pro Monthly</Button>
            </Link>
          </div>

          {/* Pro Annual */}
          <div className="surface-card p-6 flex flex-col">
            <h2 className="text-xl font-display uppercase italic">Pro Annual</h2>
            <p className="text-sm text-muted-foreground mt-1">Best value · save 17%</p>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-display tabular-nums">$50</span>
              <span className="text-sm text-muted-foreground">/ year</span>
            </div>
            <p className="text-[11px] text-primary font-semibold mt-1">≈ $4.17 / month</p>
            <ul className="mt-6 space-y-2.5 text-sm flex-1">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 font-semibold">
                <Check className="size-4 mt-0.5 text-primary shrink-0" />
                <span>2 months free vs. monthly</span>
              </li>
            </ul>
            <Link to="/auth" className="mt-6">
              <Button className="w-full" variant="outline">Start Pro Annual</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 surface-card p-6 text-center">
          <h3 className="font-display uppercase italic text-lg">Risk-free trial</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Not satisfied within 30 days? Email <a href="mailto:support@fitplancoach.com" className="text-primary underline">support@fitplancoach.com</a> for a full refund — no questions, no forms.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Payments are processed securely via PayPal and QRIS. All prices in USD. Taxes calculated at checkout where applicable. See our{" "}
          <Link to="/refunds" className="underline">refund policy</Link> and{" "}
          <Link to="/terms" className="underline">terms</Link>.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
