import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { PhoneMockup } from "@/components/PhoneMockup";
import { DashboardScreen } from "@/components/AppScreens";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Zap, Utensils, Dumbbell, LineChart, Check, Target, Calendar, ShieldCheck, Lock, RefreshCcw, CreditCard, Star, Quote, Smartphone, WifiOff, Bell } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPlanCoach — Personalized Fitness & Nutrition Coaching" },
      { name: "description", content: "Personalized meal plans, adaptive workouts, and progress tracking — tailored to your body, goals, schedule, and budget. Start free. Cancel anytime." },
      { property: "og:title", content: "FitPlanCoach" },
      { property: "og:description", content: "Personalized fitness coaching that adapts to you. Start free, cancel anytime, 30-day refund." },
      { property: "og:url", content: "https://fitplancoach.com/" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "FitPlanCoach",
          url: "https://fitplancoach.com/",
          logo: "https://fitplancoach.com/icon-512.png",
          sameAs: [],
          contactPoint: [{ "@type": "ContactPoint", email: "support@fitplancoach.com", contactType: "customer support" }],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "FitPlanCoach",
          url: "https://fitplancoach.com/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FitPlanCoach",
          operatingSystem: "Android",
          applicationCategory: "HealthApplication",
          description:
            "Personalized meal plans, adaptive workouts, and progress tracking that adapt to your body, goals, schedule, and budget.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Landing,
});

const HOW_IT_WORKS = [
  { n: "01", icon: Target, title: "Tell us about you", body: "5-minute onboarding: body metrics, activity level, goals, food preferences, equipment, and weekly availability." },
  { n: "02", icon: Zap, title: "Get your plan", body: "We calculate calorie and macro targets using proven sports-nutrition formulas, then build matching meals and workouts." },
  { n: "03", icon: LineChart, title: "Track and adapt", body: "Log meals, weight, and workouts. See trends weekly. Premium users get a fresh plan every week." },
];

const BENEFITS = [
  { icon: Utensils, title: "Plans built around you", body: "Macros match your goal. Meals respect your allergies, dislikes, and grocery budget." },
  { icon: Dumbbell, title: "Workouts that fit life", body: "Gym, home, or hybrid. 3 days or 6. Beginner or advanced — the plan adapts." },
  { icon: LineChart, title: "Honest progress data", body: "Weight, measurements, and workouts in one place. No vanity metrics." },
  { icon: ShieldCheck, title: "Your data stays yours", body: "Encrypted in transit, row-level secured. We never sell personal data." },
  { icon: Calendar, title: "Weekly regeneration", body: "Premium subscribers get a fresh meal & workout plan every week to prevent staleness." },
  { icon: CreditCard, title: "Transparent billing", body: "Monthly subscription, cancel anytime in one click, 30-day money-back guarantee." },
];

const TESTIMONIALS = [
  { name: "Marcus T.", role: "Lost 8kg in 4 months", body: "The plan finally fit my schedule. Three workouts a week, meals I actually wanted to eat. I stopped white-knuckling diets and just followed the structure." },
  { name: "Priya K.", role: "First-time lifter", body: "I had no idea what to do at the gym. The progression made sense from day one and I never felt lost. The weekly regeneration kept things interesting." },
  { name: "Jordan R.", role: "Busy parent", body: "Shopping list saved my Sundays. I batch cook on Sundays, follow the workouts on lunch breaks. Consistent for 6 months — never managed that before." },
];

const FAQ_TEASER = [
  { q: "Will it guarantee weight loss or muscle gain?", a: "No honest service can. Results depend on consistency, sleep, stress, genetics, and adherence. FitPlanCoach gives you a structured plan and tracking — the work is still yours." },
  { q: "Is this medical advice?", a: "No. FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Consult a qualified professional before significant changes to your routine." },
  { q: "Can I cancel anytime?", a: "Yes — cancel in one click from billing or at your account billing page. You keep access until the end of the current paid period, and we offer a 30-day money-back guarantee." },
  { q: "How is my data used?", a: "We use your profile to generate plans. Data is stored encrypted in transit, protected by row-level security, and never sold. See our Privacy Notice." },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute top-20 -left-20 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 -right-20 size-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary mb-6">
              <Zap className="size-3" fill="currentColor" /> Personalized for your body & schedule
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display uppercase italic tracking-tight">
              Train smart.<br />
              <span className="text-primary">Eat with purpose.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              FitPlanCoach builds personalized meal plans and adaptive workouts around your body, goals,
              schedule, and budget — then tracks every kg you move. No fads, no guarantees, just structure.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <GooglePlayButton size="lg" />
              <Link to="/auth">
                <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-7 h-14 border-border-strong">
                  Start free on web
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free to start on Android — also works in any browser.</p>
            <div className="mt-10 flex items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> 30-day refund</span>
              <span className="flex items-center gap-1.5"><Lock className="size-3 text-primary" /> Secure checkout</span>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-14 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Who it's for</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-display uppercase italic">Built for the rest of us</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Beginners building their first habit. Intermediates breaking plateaus. Busy adults who
              want structure without hiring a coach. If you have a phone and 30 minutes, you have a plan.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Why FitPlanCoach</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Real benefits, honest copy</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((f) => (
              <div key={f.title} className="surface-card p-7 hover:border-border-strong transition">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h2 className="font-display text-lg uppercase italic">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">How it works</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">From signup to first workout in under 10 minutes</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.n} className="surface-card p-7 relative">
                  <div className="text-5xl font-display italic text-primary/30 leading-none">{s.n}</div>
                  <s.icon className="size-5 text-primary mt-4" />
                  <h2 className="mt-3 font-display text-lg uppercase italic">{s.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">After you subscribe</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">What you actually receive</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              { title: "Daily meal plan", body: "Breakfast, lunch, dinner, snacks — built to hit your macros and respect your budget and preferences." },
              { title: "Weekly workout schedule", body: "Sessions matched to your equipment, experience, and weekly availability with built-in progression." },
              { title: "Shopping list", body: "Aggregated weekly grocery list, ready to take to the store or import to delivery." },
              { title: "Progress dashboard", body: "Weight trend, workout streak, calorie & protein adherence — all in one place." },
              { title: "Weekly regeneration (Premium)", body: "A fresh plan every week to prevent food fatigue and training plateaus." },
              { title: "Mobile PWA", body: "Install on your phone home screen. Works offline for viewing your current plan." },
            ].map((x) => (
              <div key={x.title} className="surface-card p-6 flex gap-4">
                <Check className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{x.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{x.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Get the app */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <PhoneMockup width={244}><DashboardScreen /></PhoneMockup>
            </div>
            <div className="order-1 lg:order-2">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Get the app</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Take FitPlanCoach with you</h2>
              <p className="mt-3 text-muted-foreground">
                The Android app puts your plan, workouts, and tracking one tap from your home screen —
                and keeps your current plan available even when you're offline.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: WifiOff, text: "Your plan, workouts & shopping list work offline" },
                  { icon: Bell, text: "Gentle, optional reminders to keep your streak" },
                  { icon: Smartphone, text: "Fast, native-feeling, one-tap logging" },
                ].map((b) => (
                  <li key={b.text} className="flex items-center gap-3 text-sm">
                    <span className="size-8 rounded-lg bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
                      <b.icon className="size-4 text-primary" />
                    </span>
                    {b.text}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-4 flex-wrap">
                <GooglePlayButton size="lg" />
                <Link to="/download" className="text-sm text-primary hover:underline font-semibold">
                  See everything in the app →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Simple pricing</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Start free. Upgrade when ready.</h2>
              <p className="mt-3 text-muted-foreground">Monthly billing in USD by our team, our Merchant of Record. Applicable taxes calculated at checkout. Cancel anytime.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {[
                { name: "Free", price: "$0", note: "Starter plan + basic tracking" },
                { name: "Pro", price: "$5", note: "Unlimited plans + full tracking" },
                { name: "Premium", price: "$10", note: "Weekly regeneration + customization", featured: true },
                { name: "Elite", price: "$15", note: "Advanced analytics + priority access" },
              ].map((p) => (
                <div key={p.name} className={`surface-card p-6 ${p.featured ? "ring-2 ring-primary/50 shadow-[var(--shadow-lime)]" : ""}`}>
                  {p.featured && <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Most popular</div>}
                  <div className="font-display uppercase italic text-lg">{p.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-display italic">{p.price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{p.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/pricing">
                <Button variant="outline" className="font-bold uppercase tracking-wider border-border-strong">
                  Full pricing details
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Member stories</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Real people, structured progress</h2>
            <p className="mt-3 text-sm text-muted-foreground">Individual results vary and depend on consistency, sleep, stress, genetics, and adherence.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="surface-card p-7">
                <Quote className="size-5 text-primary" />
                <blockquote className="mt-3 text-sm text-foreground leading-relaxed">"{t.body}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center font-display italic text-sm">{t.name[0]}</div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Trust / Security strip */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-10 grid gap-6 md:grid-cols-4 text-center md:text-left">
            {[
              { icon: Lock, title: "Secure checkout", body: "PayPal & QRIS — manually reviewed" },
              { icon: ShieldCheck, title: "Private by default", body: "Encrypted in transit, row-level secured" },
              { icon: RefreshCcw, title: "30-day refund", body: "Money back, no fine print" },
              { icon: Star, title: "Cancel anytime", body: "One click, no phone calls" },
            ].map((b) => (
              <div key={b.title} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
                  <b.icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Answers up front</h2>
          </div>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ_TEASER.map((f, i) => (
              <AccordionItem key={i} value={`tf-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-6 text-center">
            <Link to="/faq" className="text-sm text-primary hover:underline">See all FAQs →</Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="text-3xl md:text-5xl font-display uppercase italic tracking-tight">Ready to move?</h2>
            <p className="mt-4 text-muted-foreground">Download free and generate your first plan in minutes. No credit card. Cancel anytime.</p>
            <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
              <GooglePlayButton size="lg" />
              <Link to="/auth">
                <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-8 h-14 border-border-strong">
                  Start free on web
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-xs text-muted-foreground italic max-w-xl mx-auto">
              FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Consult a
              qualified professional before significant changes to your diet or exercise routine.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
