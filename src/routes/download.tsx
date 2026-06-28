import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { PhoneMockup } from "@/components/PhoneMockup";
import { DashboardScreen, WorkoutScreen, MealsScreen } from "@/components/AppScreens";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  WifiOff, Bell, Smartphone, Gauge, ShieldCheck, Flame, Check, Dumbbell,
  TrendingDown, Target,
} from "lucide-react";
import { PLAY_STORE_URL, isPlayStoreLive, ANDROID_MIN_VERSION } from "@/lib/app-config";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download FitPlanCoach for Android — Free on Google Play" },
      {
        name: "description",
        content:
          "Get the FitPlanCoach Android app free on Google Play. Personalized workouts, meal plans, and progress tracking that adapt to you — in your pocket, even offline.",
      },
      { property: "og:title", content: "Download FitPlanCoach for Android" },
      { property: "og:description", content: "Personalized workouts, meal plans, and progress tracking — free on Google Play." },
      { property: "og:url", content: "https://fitplancoach.com/download" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Download FitPlanCoach for Android" },
      { name: "twitter:description", content: "Personalized workouts, meal plans, and progress tracking — free on Google Play." },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/download" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FitPlanCoach",
          operatingSystem: `Android ${ANDROID_MIN_VERSION}+`,
          applicationCategory: "HealthApplication",
          description:
            "Personalized meal plans, adaptive workouts, and honest progress tracking that adapt to your body, goals, schedule, and budget.",
          ...(isPlayStoreLive ? { downloadUrl: PLAY_STORE_URL, installUrl: PLAY_STORE_URL } : {}),
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://fitplancoach.com/" },
            { "@type": "ListItem", position: 2, name: "Download", item: "https://fitplancoach.com/download" },
          ],
        }),
      },
    ],
  }),
  component: DownloadPage,
});

const WHY_INSTALL = [
  { icon: WifiOff, title: "Works offline", body: "Your current plan, workouts, and shopping list stay available at the gym or on the road — no signal required." },
  { icon: Bell, title: "Gentle reminders", body: "Optional nudges help you keep your streak and never miss a planned session. Turn them off any time." },
  { icon: Gauge, title: "Faster and smoother", body: "A native-feeling home-screen app: instant launch, fluid navigation, and one-tap logging." },
  { icon: Flame, title: "Streaks that motivate", body: "Watch your consistency build day by day. Progress you can see is progress you keep." },
  { icon: ShieldCheck, title: "Private by default", body: "Encrypted in transit and protected by row-level security. Your data is yours — never sold." },
  { icon: Smartphone, title: "Always with you", body: "Log meals and weight the moment they happen, straight from your phone's home screen." },
];

const OUTCOMES = [
  { icon: TrendingDown, title: "Lose fat without guesswork", body: "Calorie and macro targets calculated for your body, with meals you'll actually eat." },
  { icon: Dumbbell, title: "Build strength with structure", body: "Progressive workouts matched to your equipment and experience — beginner to advanced." },
  { icon: Target, title: "Stay consistent", body: "Simple daily actions, visible streaks, and weekly check-ins keep you on track." },
];

const APP_FAQ = [
  { q: "Is the app free?", a: "Yes. Download and start free — generate a plan and track your basics at no cost. Premium plans unlock weekly regeneration and deeper customization, and you can upgrade whenever you're ready." },
  { q: "Which Android versions are supported?", a: `FitPlanCoach runs on Android ${ANDROID_MIN_VERSION} and newer, which covers the vast majority of active devices.` },
  { q: "Is there an iPhone version?", a: "Not yet — Android is first. In the meantime, FitPlanCoach works in any modern browser, and you can add it to your iPhone home screen from Safari for an app-like experience." },
  { q: "Does it work offline?", a: "Your current plan, workouts, and shopping list are viewable offline. Logging and generating new plans sync automatically once you're back online." },
  { q: "Will my data be safe?", a: "Your data is encrypted in transit, protected by row-level security so only you can see it, and never sold. You can export or delete it any time." },
];

function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 bg-grid opacity-60" />
          <div className="absolute top-10 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-10 -right-24 size-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary mb-6">
                <Smartphone className="size-3" /> Android app
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display uppercase italic tracking-tight text-balance">
                Your coach,<br />
                <span className="text-gradient">in your pocket.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Personalized workouts, meal plans, and honest progress tracking — built around your
                body and schedule, and always a tap away. Free to start.
              </p>
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <GooglePlayButton size="lg" staticBadge />
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-6 h-14 border-border-strong">
                    Use it on the web
                  </Button>
                </Link>
              </div>
              {!isPlayStoreLive && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Launching soon on Google Play. Start free in your browser today — your progress
                  carries over to the app.
                </p>
              )}
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> Free to start</span>
                <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="size-3 text-primary" /> Works offline</span>
              </div>
            </div>
            <div className="flex justify-center">
              <PhoneMockup width={264} glow>
                <DashboardScreen />
              </PhoneMockup>
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">A look inside</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Everything in one app</h2>
              <p className="mt-3 text-muted-foreground">
                Track today, follow your session, and stick to your plan — without juggling five
                different apps and a spreadsheet.
              </p>
            </div>
            <div className="mt-12 flex flex-wrap items-start justify-center gap-8 sm:gap-10 reveal">
              {[
                { screen: <DashboardScreen />, label: "Daily dashboard", sub: "Calories, macros & streak at a glance" },
                { screen: <WorkoutScreen />, label: "Guided workouts", sub: "Today's session, set by set" },
                { screen: <MealsScreen />, label: "Meal plans", sub: "Built to hit your targets" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center">
                  <PhoneMockup width={220}>{s.screen}</PhoneMockup>
                  <div className="mt-5 text-center">
                    <div className="font-display uppercase italic">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why install */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Why the app</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Reasons to install</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 reveal">
              {WHY_INSTALL.map((f) => (
                <div key={f.title} className="surface-card card-lift p-7">
                  <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
                    <f.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg uppercase italic">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">What you'll achieve</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Real goals, a clear path</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Results depend on consistency, sleep, stress, genetics, and adherence — the app gives
              you the structure and tracking to show up for the work.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3 reveal">
            {OUTCOMES.map((o) => (
              <div key={o.title} className="surface-card card-lift p-7">
                <o.icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-lg uppercase italic">{o.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{o.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* App FAQ */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">App FAQ</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-display uppercase italic">Before you download</h2>
            </div>
            <Accordion type="single" collapsible className="mt-8">
              {APP_FAQ.map((f, i) => (
                <AccordionItem key={i} value={`af-${i}`}>
                  <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="text-3xl md:text-5xl font-display uppercase italic tracking-tight">Start today</h2>
            <p className="mt-4 text-muted-foreground">
              Download free and generate your first plan in minutes. No credit card, cancel anytime.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
              <GooglePlayButton size="lg" staticBadge />
              <Link to="/auth">
                <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-6 h-14 border-border-strong">
                  Continue on web
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-xs text-muted-foreground italic max-w-xl mx-auto">
              FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Consult
              a qualified professional before significant changes to your diet or exercise routine.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
