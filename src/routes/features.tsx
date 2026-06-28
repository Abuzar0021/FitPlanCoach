import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { AppCtaBand } from "@/components/AppCtaBand";
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
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-6xl px-6 py-16 w-full">
        <div className="max-w-2xl reveal">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
            Features
          </span>
          <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tight text-balance">Everything inside FitPlanCoach</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete fitness toolkit in one app: personalized planning, adaptive workouts, and honest
            progress tracking. No fads, no guarantees — just structure that compounds, week after week.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 reveal">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface-card card-lift p-6">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-4">
                <f.icon className="size-5 text-primary" />
              </div>
              <h2 className="font-display text-base uppercase italic">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs text-muted-foreground italic text-center max-w-2xl mx-auto">
          FitPlanCoach provides fitness and nutrition guidance and is not medical advice. Individual results
          vary and depend on consistency, sleep, stress, genetics, and other factors.
        </p>
      </main>

      <AppCtaBand
        heading="See it work for your goals"
        sub="Download FitPlanCoach free on Android and turn these features into a plan built around you."
      />

      <PublicFooter />
    </div>
  );
}
