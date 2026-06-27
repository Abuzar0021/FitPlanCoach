import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

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
  { v: "sedentary", l: "Sedentary", d: "Little or no exercise" },
  { v: "light", l: "Light", d: "1–3 days/week" },
  { v: "moderate", l: "Moderate", d: "3–5 days/week" },
  { v: "active", l: "Active", d: "6–7 days/week" },
] as const;

const GOALS = [
  { v: "lose_fat", l: "Lose fat", d: "−500 kcal/day" },
  { v: "build_muscle", l: "Build muscle", d: "+300 kcal/day" },
  { v: "maintain", l: "Maintain", d: "Stay where you are" },
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
    supabase.from("profiles").select("name,onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.onboarded) navigate({ to: "/dashboard" });
      if (data?.name) setForm((f) => ({ ...f, name: data.name! }));
    });
  }, [user, navigate]);

  async function finish() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
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
    }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("analytics_events").insert({ user_id: user.id, event: "onboarded" });
    toast.success("All set! Let's build your plan.");
    navigate({ to: "/dashboard" });
  }

  const steps = [
    {
      title: "Tell us about you",
      body: (
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Your name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Age</Label><Input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Country</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {["global","USA","UK","India","Mexico","Japan","Nigeria"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["male","female","other"] as const).map(g => (
                <button type="button" key={g} onClick={() => setForm({ ...form, gender: g })}
                  className={`py-2 rounded-xl border text-sm capitalize transition ${form.gender===g?"border-primary bg-primary/10 text-primary font-semibold":"border-border"}`}>{g}</button>
              ))}
            </div>
          </div>
        </div>
      ),
      canNext: !!form.name && !!form.age,
    },
    {
      title: "Your body",
      body: (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Height (cm)</Label><Input inputMode="numeric" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Weight (kg)</Label><Input inputMode="decimal" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
        </div>
      ),
      canNext: Number(form.height_cm) > 0 && Number(form.weight_kg) > 0,
    },
    {
      title: "Activity level",
      body: (
        <div className="space-y-2">
          {ACTIVITY.map(a => (
            <button key={a.v} type="button" onClick={() => setForm({ ...form, activity_level: a.v })}
              className={`w-full text-left p-4 rounded-2xl border transition ${form.activity_level===a.v?"border-primary bg-primary/10":"border-border"}`}>
              <div className="font-semibold">{a.l}</div><div className="text-xs text-muted-foreground">{a.d}</div>
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
    {
      title: "Your goal",
      body: (
        <div className="space-y-2">
          {GOALS.map(g => (
            <button key={g.v} type="button" onClick={() => setForm({ ...form, goal: g.v })}
              className={`w-full text-left p-4 rounded-2xl border transition ${form.goal===g.v?"border-primary bg-primary/10":"border-border"}`}>
              <div className="font-semibold">{g.l}</div><div className="text-xs text-muted-foreground">{g.d}</div>
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
    {
      title: "Food budget",
      body: (
        <div className="grid grid-cols-3 gap-2">
          {BUDGETS.map(b => (
            <button key={b.v} type="button" onClick={() => setForm({ ...form, budget_level: b.v })}
              className={`py-4 rounded-2xl border text-sm font-semibold transition ${form.budget_level===b.v?"border-primary bg-primary/10 text-primary":"border-border"}`}>{b.l}</button>
          ))}
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-background flex flex-col mx-auto max-w-md w-full px-5 py-8">
      <div className="mb-6"><Logo /></div>
      <div className="flex gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <h1 className="text-2xl mb-6">{current.title}</h1>
      <div className="flex-1">{current.body}</div>
      <div className="flex gap-3 mt-8">
        {step > 0 && <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < steps.length - 1 ? (
          <Button className="flex-1 h-11" disabled={!current.canNext} onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button className="flex-1 h-11" onClick={finish}>Finish</Button>
        )}
      </div>
    </div>
  );
}
