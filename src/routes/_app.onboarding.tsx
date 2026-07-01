import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
} from "lucide-react";

export const Route = createFileRoute("/_app/onboarding")({
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

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name,onboarded")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarded) navigate({ to: "/dashboard" });
        if (data?.name) setForm((f) => ({ ...f, name: data.name! }));
      });
  }, [user, navigate]);

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
        onboarded: true,
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
    await supabase.from("analytics_events").insert({ user_id: user.id, event: "onboarded" });
    toast.success("You're all set — let's build your plan.");
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
    <div className="min-h-screen bg-background flex flex-col mx-auto max-w-md w-full px-5 py-8">
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
            {saving ? "Building…" : "Build my plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
