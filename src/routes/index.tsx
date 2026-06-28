import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { PhoneMockup } from "@/components/PhoneMockup";
import { DashboardScreen, WorkoutScreen } from "@/components/AppScreens";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Zap, Utensils, Dumbbell, LineChart, Check, Target, Calendar, ShieldCheck, Lock,
  RefreshCcw, Star, Smartphone, WifiOff, Bell, Flame, Clock, ShoppingCart, X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPlanCoach — Personalized Workout & Meal Plans for Android" },
      { name: "description", content: "FitPlanCoach builds personalized workouts and meal plans around your body, goals, schedule, and budget — then tracks your progress. Free on Android. No credit card, cancel anytime." },
      { property: "og:title", content: "FitPlanCoach — Personalized Workout & Meal Plans" },
      { property: "og:description", content: "Personalized fitness and nutrition that adapts to you. Free on Android. Start in minutes." },
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
          contactPoint: [{ "@type": "ContactPoint", email: "abuzarelahi01@gmail.com", contactType: "customer support" }],
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

const STATS = [
  { value: "10 min", label: "To your first plan" },
  { value: "1,000+", label: "Exercises in the library" },
  { value: "3 goals", label: "Lose fat · build muscle · recomp" },
  { value: "$0", label: "To get started" },
];

const PROBLEMS = [
  "Generic plans that ignore your schedule, equipment, and food preferences",
  "Endless conflicting advice and no idea where to actually start",
  "Motivation that fades by week two with nothing tracking your progress",
  "Personal trainers and meal-prep services priced out of reach",
];

const SOLUTIONS = [
  "A plan calculated from your body, goals, and weekly availability",
  "One clear path: today's workout, today's meals, today's targets",
  "Streaks, trends, and gentle reminders that keep you showing up",
  "Premium coaching-style structure starting free, Pro from $5/mo",
];

const HOW_IT_WORKS = [
  { n: "01", icon: Target, title: "Tell us about you", body: "A 5-minute onboarding covers your body metrics, activity level, goals, food preferences, equipment, and how many days you can train." },
  { n: "02", icon: Zap, title: "Get your plan", body: "We calculate your calorie and macro targets with proven sports-nutrition formulas, then build meals and workouts that match — instantly." },
  { n: "03", icon: LineChart, title: "Track and adapt", body: "Log meals, weight, and sessions in a tap. See your trends each week. Pro members get a fresh plan every week to keep momentum." },
];

const FEATURES = [
  { icon: Utensils, title: "Meals built around you", body: "Daily meals matched to your macros and budget, respecting allergies and foods you dislike. Swap any meal for an equivalent in one tap." },
  { icon: Dumbbell, title: "Workouts that fit real life", body: "Gym, home, or hybrid. Three days or six. Beginner to advanced. Progressive overload is built in so you keep moving forward." },
  { icon: ShoppingCart, title: "An automatic shopping list", body: "Your week of meals becomes one aggregated grocery list — ready for the store or your delivery app. No more guesswork on Sundays." },
  { icon: LineChart, title: "Progress you can trust", body: "Weight trend, workout streak, and calorie & protein adherence in one clear dashboard. Real signals, not vanity metrics." },
  { icon: Calendar, title: "Weekly regeneration", body: "Pro members get a fresh meal and workout plan every week — preventing food fatigue and training plateaus before they start." },
  { icon: ShieldCheck, title: "Private by default", body: "Your data is encrypted in transit, protected by row-level security, and never sold. It's yours to export or delete any time." },
];

const TESTIMONIALS = [
  { name: "Marcus T.", role: "Lost 8 kg in 4 months", body: "The plan finally fit my schedule — three workouts a week and meals I actually wanted to eat. I stopped white-knuckling diets and just followed the structure." },
  { name: "Priya K.", role: "First-time lifter", body: "I had no idea what to do at the gym. The progression made sense from day one and I never felt lost. The weekly refresh kept things interesting." },
  { name: "Jordan R.", role: "Busy parent of two", body: "The shopping list saved my Sundays. I batch-cook, then follow the workouts on lunch breaks. Six months consistent — I've never managed that before." },
];

const FAQ_TEASER = [
  { q: "Is it really free to start?", a: "Yes. Download the app, complete onboarding, and get a personalized plan with basic tracking at no cost. Pro unlocks unlimited regeneration and full tracking from $5/month, and you can upgrade whenever you're ready." },
  { q: "Will it guarantee weight loss or muscle gain?", a: "No honest service can. Results depend on consistency, sleep, stress, genetics, and adherence. FitPlanCoach gives you a structured plan and clear tracking — the work is still yours, but you'll never be guessing." },
  { q: "Is this medical advice?", a: "No. FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Consult a qualified professional before significant changes to your diet or exercise routine." },
  { q: "Can I cancel anytime?", a: "Yes — cancel in one click from your billing page. You keep access until the end of the current paid period, and every subscription is backed by a 30-day money-back guarantee." },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 bg-grid opacity-60" />
          <div className="absolute top-16 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-10 -right-24 size-96 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary mb-6">
                <Zap className="size-3" fill="currentColor" /> Personalized for your body &amp; schedule
              </span>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-display uppercase italic tracking-tight text-balance">
                Train smart.<br />
                <span className="text-gradient">Eat with purpose.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                FitPlanCoach builds personalized workouts and meal plans around your goals, schedule,
                and budget — then tracks every rep and every kg. No fads. No guesswork. Just a plan
                you'll actually stick to.
              </p>
              <div className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <GooglePlayButton size="lg" />
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-7 h-14 border-border-strong">
                    Start free on web
                  </Button>
                </Link>
              </div>
              <div className="mt-7 flex items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> Cancel anytime</span>
                <span className="flex items-center gap-1.5"><RefreshCcw className="size-3 text-primary" /> 30-day refund</span>
                <span className="flex items-center gap-1.5"><Lock className="size-3 text-primary" /> Secure checkout</span>
              </div>
            </div>

            {/* Device */}
            <div className="relative flex justify-center lg:justify-end">
              <PhoneMockup width={272} glow>
                <DashboardScreen />
              </PhoneMockup>
              {/* floating accents */}
              <div className="hidden sm:flex animate-float absolute -left-2 top-16 glass rounded-2xl px-3 py-2 items-center gap-2 shadow-[var(--shadow-card)]">
                <span className="size-8 rounded-lg bg-orange-500/15 inline-flex items-center justify-center">
                  <Flame className="size-4 text-orange-500" />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-bold tabular-nums">12-day streak</div>
                  <div className="text-[9px] text-muted-foreground">Consistency, tracked</div>
                </div>
              </div>
              <div className="hidden sm:flex animate-float-slow absolute -right-1 bottom-14 glass rounded-2xl px-3 py-2 items-center gap-2 shadow-[var(--shadow-card)]">
                <span className="size-8 rounded-lg bg-primary/15 inline-flex items-center justify-center">
                  <Check className="size-4 text-primary" />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-bold">On track today</div>
                  <div className="text-[9px] text-muted-foreground">118g / 160g protein</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capability stats */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 reveal">
            {STATS.map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-display italic text-primary tabular-nums">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl reveal">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Why most plans fail</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">Getting fit isn't the hard part. Staying consistent is.</h2>
            <p className="mt-3 text-muted-foreground">
              Most people don't fail from lack of effort — they fail from plans that don't fit their
              life. FitPlanCoach is built to fix exactly that.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 reveal">
            <div className="surface-card p-7">
              <div className="text-xs font-bold uppercase tracking-widest text-destructive/90">The usual way</div>
              <ul className="mt-4 space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="size-4 mt-0.5 text-destructive/70 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-card p-7 ring-1 ring-primary/20">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">The FitPlanCoach way</div>
              <ul className="mt-4 space-y-3">
                {SOLUTIONS.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-sm">
                    <Check className="size-4 mt-0.5 text-primary shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl reveal">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">How it works</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">From signup to your first workout in under 10 minutes</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3 reveal">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.n} className="surface-card card-lift p-7 relative">
                  <div className="text-5xl font-display italic text-primary/25 leading-none">{s.n}</div>
                  <s.icon className="size-5 text-primary mt-4" />
                  <h3 className="mt-3 font-display text-lg uppercase italic">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl reveal">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Everything included</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">One app for your training, nutrition, and progress</h2>
            <p className="mt-3 text-muted-foreground">No more juggling five apps and a spreadsheet. It's all here, and it all talks to itself.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 reveal">
            {FEATURES.map((f) => (
              <div key={f.title} className="surface-card card-lift p-7">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-display text-lg uppercase italic">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* App showcase */}
        <section className="border-t border-border bg-card/30 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative flex justify-center order-2 lg:order-1 reveal">
              <PhoneMockup width={224} className="hidden sm:block translate-y-4 -rotate-3"><WorkoutScreen /></PhoneMockup>
              <PhoneMockup width={224} className="sm:-ml-16 z-10 sm:rotate-3" glow><DashboardScreen /></PhoneMockup>
            </div>
            <div className="order-1 lg:order-2 reveal">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Get the app</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">Your coach, one tap from the home screen</h2>
              <p className="mt-3 text-muted-foreground">
                The Android app keeps your plan, workouts, and tracking always within reach — and your
                current meal plan is saved to your device, so it's there in a tap even on a flaky gym connection.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: WifiOff, text: "Your current plan is saved to your device for quick access" },
                  { icon: Bell, text: "Gentle, optional reminders to protect your streak" },
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

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl reveal">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Member stories</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">Real people, structured progress</h2>
            <p className="mt-3 text-sm text-muted-foreground">Individual results vary and depend on consistency, sleep, stress, genetics, and adherence.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3 reveal">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="surface-card card-lift p-7">
                <div className="flex items-center gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5" fill="currentColor" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm text-foreground leading-relaxed">"{t.body}"</blockquote>
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

        {/* Pricing teaser */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center max-w-2xl mx-auto reveal">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Simple pricing</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">Start free. Upgrade when you're ready.</h2>
              <p className="mt-3 text-muted-foreground">No credit card to begin. Cancel in one click. Every paid plan is backed by a 30-day money-back guarantee.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3 max-w-4xl mx-auto reveal">
              {[
                { name: "Free", price: "$0", per: "forever", note: "1 personalized plan and basic tracking — yours to keep." },
                { name: "Pro Monthly", price: "$5", per: "/mo", note: "Unlimited plans, weekly refresh, and full progress tracking.", featured: true },
                { name: "Pro Annual", price: "$50", per: "/yr", note: "Everything in Pro with two months free vs. monthly." },
              ].map((p) => (
                <div key={p.name} className={`surface-card p-6 ${p.featured ? "ring-2 ring-primary/50 shadow-[var(--shadow-lime)]" : ""}`}>
                  {p.featured && <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Most popular</div>}
                  <div className="font-display uppercase italic text-lg">{p.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-display italic tabular-nums">{p.price}</span>
                    <span className="text-xs text-muted-foreground">{p.per}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/pricing">
                <Button variant="outline" className="font-bold uppercase tracking-wider border-border-strong">
                  Compare plans in detail
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Trust / guarantee strip */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-10 grid gap-6 md:grid-cols-4 text-center md:text-left reveal">
            {[
              { icon: RefreshCcw, title: "30-day refund", body: "Money back, no fine print" },
              { icon: ShieldCheck, title: "Private by default", body: "Encrypted, row-level secured" },
              { icon: Clock, title: "Cancel anytime", body: "One click, no phone calls" },
              { icon: Lock, title: "Secure checkout", body: "PayPal & QRIS, manually reviewed" },
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
          <div className="text-center reveal">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic text-balance">Answers up front</h2>
          </div>
          <Accordion type="single" collapsible className="mt-8 reveal">
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
        <section className="relative overflow-hidden border-t border-border bg-card/30">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center reveal">
            <h2 className="text-3xl md:text-5xl font-display uppercase italic tracking-tight text-balance">Ready to move?</h2>
            <p className="mt-4 text-muted-foreground">Download free and generate your first personalized plan in minutes. No credit card. Cancel anytime.</p>
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
