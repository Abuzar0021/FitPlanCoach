import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Utensils, Dumbbell, LineChart, Target, Calendar, ShoppingCart, Camera, Smartphone } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — FitPlanCoach" },
      { name: "description", content: "Personalized meal planning, smart workouts, body & weight tracking, weekly regeneration, and mobile PWA — all the features in FitPlanCoach." },
      { property: "og:title", content: "FitPlanCoach Features" },
      { property: "og:url", content: "https://fitplancoach.com/features" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/features" }],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  { icon: Target, title: "Smart onboarding", body: "Tell us your age, body metrics, activity level, goals, and preferences. We calculate your calorie and macro targets using proven sports-nutrition formulas." },
  { icon: Utensils, title: "Personalized meal plans", body: "Daily meals matched to your macros, allergies, dislikes, and grocery budget. Swap any meal for an equivalent alternative." },
  { icon: Dumbbell, title: "Adaptive workouts", body: "Routines built for your experience level, available equipment, and weekly schedule. Progressive overload baked in." },
  { icon: LineChart, title: "Progress tracking", body: "Log weight, body measurements, and completed workouts. See trends, not just numbers." },
  { icon: Camera, title: "Progress photos", body: "Private photo timeline you control. Stored encrypted, never shared." },
  { icon: ShoppingCart, title: "Shopping lists", body: "Auto-generated weekly grocery list aggregated from your meal plan." },
  { icon: Calendar, title: "Weekly regeneration", body: "Premium users get a fresh plan every week — keeps food interesting and prevents training plateaus." },
  { icon: Smartphone, title: "Mobile PWA", body: "Install FitPlanCoach on iOS or Android home screens. Works offline for viewing your current plan." },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Pricing</Link>
            <Link to="/auth"><Button size="sm" className="font-bold uppercase tracking-wide">Sign in</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl px-6 py-16 w-full">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight">Everything inside FitPlanCoach</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete fitness operating system: personalized planning, adaptive workouts, and honest
            progress tracking. No fads, no guarantees — just structure that compounds.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface-card p-6 hover:border-border-strong transition">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
                <f.icon className="size-5 text-primary" />
              </div>
              <h2 className="font-display text-base uppercase italic">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link to="/auth">
            <Button size="lg" className="font-bold uppercase tracking-wider px-8 h-12 shadow-[var(--shadow-lime)]">
              Start free
            </Button>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required.</p>
        </div>

        <p className="mt-12 text-xs text-muted-foreground italic text-center max-w-2xl mx-auto">
          FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Individual results
          vary and depend on consistency, sleep, stress, genetics, and other factors.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
