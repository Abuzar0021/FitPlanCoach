import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { CountrySelect } from "@/components/CountrySelect";
import {
  Armchair,
  Footprints,
  Activity,
  Flame,
  TrendingDown,
  Dumbbell,
  Minus,
  Check,
  Building2,
  Home,
  Sprout,
  BicepsFlexed,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/_app/onboarding")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Welcome — FitPlanCoach" }] }),
  component: Onboarding,
});

type Form = {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  height_cm: string;
  weight_kg: string;
  country: string;
  activity_level: "sedentary" | "light" | "moderate" | "active";
  goal: "lose_fat" | "build_muscle" | "maintain";
  budget_level: "low" | "medium" | "high";
  workout_location: "gym" | "home";
  available_equipment: ("dumbbells" | "bands")[];
  experience_level: "beginner" | "intermediate" | "advanced";
};

const ACTIVITY = [
  { v: "sedentary", l: "Sedentary", d: "Little or no exercise", icon: Armchair },
  { v: "light", l: "Light", d: "1–3 days/week", icon: Footprints },
  { v: "moderate", l: "Moderate", d: "3–5 days/week", icon: Activity },
  { v: "active", l: "Active", d: "6–7 days/week", icon: Flame },
] as const;

const GOALS = [
  { v: "lose_fat", l: "Lose fat", d: "−500 kcal/day", icon: TrendingDown },
  { v: "build_muscle", l: "Build muscle", d: "+300 kcal/day", icon: Dumbbell },
  { v: "maintain", l: "Maintain", d: "Stay where you are", icon: Minus },
] as const;

const BUDGETS = [
  { v: "low", l: "Low" },
  { v: "medium", l: "Medium" },
  { v: "high", l: "High" },
] as const;

const LOCATIONS = [
  { v: "gym", l: "Gym", d: "Full equipment — barbells, machines, cables", icon: Building2 },
  { v: "home", l: "Home", d: "Bodyweight, dumbbells, and/or bands", icon: Home },
] as const;

const EQUIPMENT_OPTIONS = [
  { v: "dumbbells", l: "Dumbbells" },
  { v: "bands", l: "Resistance bands" },
] as const;

const EXPERIENCE = [
  { v: "beginner", l: "Beginner", d: "New to structured training", icon: Sprout },
  {
    v: "intermediate",
    l: "Intermediate",
    d: "Training consistently for 6+ months",
    icon: BicepsFlexed,
  },
  { v: "advanced", l: "Advanced", d: "Years of consistent, structured training", icon: Trophy },
] as const;

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { edit } = useSearch({ from: "/_app/onboarding" });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "",
    age: "",
    gender: "male",
    height_cm: "",
    weight_kg: "",
    country: "global",
    activity_level: "moderate",
    goal: "lose_fat",
    budget_level: "medium",
    workout_location: "gym",
    available_equipment: [],
    experience_level: "beginner",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        // Only bounce already-onboarded users away when they land here
        // organically (e.g. a stale bookmark) — not when they came from
        // Profile -> "Edit fitness details", which needs this same form.
        if (data.onboarded && !edit) {
          navigate({ to: "/dashboard" });
          return;
        }
        setForm((f) => ({
          ...f,
          name: data.name ?? f.name,
          age: data.age != null ? String(data.age) : f.age,
          gender: data.gender ?? f.gender,
          height_cm: data.height_cm != null ? String(data.height_cm) : f.height_cm,
          weight_kg: data.weight_kg != null ? String(data.weight_kg) : f.weight_kg,
          country: data.country ?? f.country,
          activity_level: data.activity_level ?? f.activity_level,
          goal: data.goal ?? f.goal,
          budget_level: data.budget_level ?? f.budget_level,
          workout_location: (data.workout_location as "gym" | "home") ?? f.workout_location,
          available_equipment:
            (data.available_equipment as ("dumbbells" | "bands")[] | null) ?? f.available_equipment,
          experience_level:
            (data.experience_level as "beginner" | "intermediate" | "advanced" | null) ??
            f.experience_level,
        }));
      });
  }, [user, navigate, edit]);

  async function finish() {
    if (!user) return;
    setSaving(true);
    // Upsert, not update: the signup trigger normally creates this row, but if
    // it's missing for any reason (e.g. manual data reset), update() would
    // silently match zero rows and report success — leaving the user stuck in
    // a loop where the dashboard never finds a profile. Upsert always leaves a
    // real row behind.
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        country: form.country,
        activity_level: form.activity_level,
        goal: form.goal,
        budget_level: form.budget_level,
        workout_location: form.workout_location,
        available_equipment: form.workout_location === "home" ? form.available_equipment : [],
        experience_level: form.experience_level,
        onboarded: true,
        // Editing existing details should refresh the plan to match on the
        // next dashboard visit (same mechanism a tier change already uses).
        ...(edit ? { needs_plan_regeneration: true } : {}),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error(error);
      setSaving(false);
      toast.error("We couldn't save your details. Please try again.");
      return;
    }
    // Same self-heal as above: ensure a subscriptions row exists (normally
    // created by the signup trigger) without clobbering an existing plan.
    await supabase
      .from("subscriptions")
      .upsert(
        { user_id: user.id, plan_type: "free", status: "active" },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    await supabase
      .from("analytics_events")
      .insert({ user_id: user.id, event: edit ? "profile_edited" : "onboarded" });
    toast.success(
      edit
        ? "Saved — your next plan will reflect these changes."
        : "You're all set — let's build your plan.",
    );
    navigate({ to: "/dashboard" });
  }

  const steps = [
    {
      title: "Tell us about you",
      subtitle: "This tailors your calorie and macro targets to your body.",
      body: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="First name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                inputMode="numeric"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g. 28"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-country">Country</Label>
              <CountrySelect
                id="onboarding-country"
                value={form.country}
                onChange={(country) => setForm({ ...form, country })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  aria-pressed={form.gender === g}
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`py-2.5 rounded-xl border text-sm capitalize transition ${form.gender === g ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-border-strong"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      canNext: !!form.name.trim() && Number(form.age) >= 13 && Number(form.age) <= 100,
    },
    {
      title: "Your body",
      subtitle: "We use this to calculate your daily energy needs — nothing is shared.",
      body: (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Height (cm)</Label>
            <Input
              inputMode="numeric"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              placeholder="e.g. 175"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input
              inputMode="decimal"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              placeholder="e.g. 72.5"
            />
          </div>
        </div>
      ),
      canNext: Number(form.height_cm) > 0 && Number(form.weight_kg) > 0,
    },
    {
      title: "How active are you?",
      subtitle: "So your plan matches how much you really move each week.",
      body: (
        <div className="space-y-2.5">
          {ACTIVITY.map((a) => {
            const active = form.activity_level === a.v;
            const Icon = a.icon;
            return (
              <button
                key={a.v}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, activity_level: a.v })}
                className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center gap-3 ${active ? "border-primary bg-primary/10" : "border-border hover:border-border-strong"}`}
              >
                <div
                  className={`size-9 rounded-xl inline-flex items-center justify-center shrink-0 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{a.l}</div>
                  <div className="text-xs text-muted-foreground">{a.d}</div>
                </div>
                {active && <Check className="size-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      ),
      canNext: true,
    },
    {
      title: "Where do you work out?",
      subtitle: "We'll only ever suggest exercises that match what you actually have.",
      body: (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {LOCATIONS.map((loc) => {
              const active = form.workout_location === loc.v;
              const Icon = loc.icon;
              return (
                <button
                  key={loc.v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm({ ...form, workout_location: loc.v })}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center gap-3 ${active ? "border-primary bg-primary/10" : "border-border hover:border-border-strong"}`}
                >
                  <div
                    className={`size-9 rounded-xl inline-flex items-center justify-center shrink-0 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{loc.l}</div>
                    <div className="text-xs text-muted-foreground">{loc.d}</div>
                  </div>
                  {active && <Check className="size-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {form.workout_location === "home" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label>What do you have at home? (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const on = form.available_equipment.includes(eq.v);
                  return (
                    <button
                      key={eq.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          available_equipment: on
                            ? f.available_equipment.filter((x) => x !== eq.v)
                            : [...f.available_equipment, eq.v],
                        }))
                      }
                      className={`py-3 rounded-xl border text-sm font-semibold transition ${on ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border-strong"}`}
                    >
                      {eq.l}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Nothing selected? You'll get pure bodyweight workouts — no equipment needed.
              </p>
            </div>
          )}
        </div>
      ),
      canNext: true,
    },
    {
      title: "Your experience level",
      subtitle: "This sets your sets, reps, rest time, and exercise complexity.",
      body: (
        <div className="space-y-2.5">
          {EXPERIENCE.map((e) => {
            const active = form.experience_level === e.v;
            const Icon = e.icon;
            return (
              <button
                key={e.v}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, experience_level: e.v })}
                className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center gap-3 ${active ? "border-primary bg-primary/10" : "border-border hover:border-border-strong"}`}
              >
                <div
                  className={`size-9 rounded-xl inline-flex items-center justify-center shrink-0 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{e.l}</div>
                  <div className="text-xs text-muted-foreground">{e.d}</div>
                </div>
                {active && <Check className="size-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      ),
      canNext: true,
    },
    {
      title: "What's your goal?",
      subtitle: "We'll set your daily calories and training focus to match.",
      body: (
        <div className="space-y-2.5">
          {GOALS.map((g) => {
            const active = form.goal === g.v;
            const Icon = g.icon;
            return (
              <button
                key={g.v}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, goal: g.v })}
                className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center gap-3 ${active ? "border-primary bg-primary/10" : "border-border hover:border-border-strong"}`}
              >
                <div
                  className={`size-9 rounded-xl inline-flex items-center justify-center shrink-0 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{g.l}</div>
                  <div className="text-xs text-muted-foreground">{g.d}</div>
                </div>
                {active && <Check className="size-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      ),
      canNext: true,
    },
    {
      title: "Your food budget",
      subtitle: "We'll choose meals and ingredients that fit your wallet.",
      body: (
        <div className="grid grid-cols-3 gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.v}
              type="button"
              aria-pressed={form.budget_level === b.v}
              onClick={() => setForm({ ...form, budget_level: b.v })}
              className={`py-4 rounded-2xl border text-sm font-semibold transition ${form.budget_level === b.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border-strong"}`}
            >
              {b.l}
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="darkroom darkroom-bay min-h-screen flex flex-col mx-auto max-w-md w-full px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
      ref={() => document.documentElement.classList.remove("in-app-boot")}
    >
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <div
        className="flex gap-1.5 mb-7"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label="Onboarding progress"
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <div key={step} className="flex-1 animate-in fade-in slide-in-from-right-3 duration-300">
        <h1 className="text-2xl font-display uppercase italic">{current.title}</h1>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">{current.subtitle}</p>
        {current.body}
      </div>

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setStep(step - 1)}
            disabled={saving}
          >
            Back
          </Button>
        )}
        {!isLast ? (
          <Button
            className="flex-1 h-12 font-bold uppercase tracking-wider"
            disabled={!current.canNext}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1 h-12 font-bold uppercase tracking-wider"
            onClick={finish}
            disabled={saving}
          >
            {saving ? "Saving…" : edit ? "Save changes" : "Build my plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
