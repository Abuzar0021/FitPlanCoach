import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: SettingsAdmin,
});

type CalorieRules = {
  tdee: { sedentary: number; light: number; moderate: number; active: number };
  goal_adjust: { lose_fat: number; build_muscle: number; maintain: number };
  protein_per_kg: number;
};

function SettingsAdmin() {
  const [appName, setAppName] = useState("FitPlanCoach");
  const [pricing, setPricing] = useState({ pro: 5, premium: 10, elite: 15, currency: "USD" });
  const [enabled, setEnabled] = useState({ free: true, pro: true, premium: true, elite: true });
  const [rules, setRules] = useState<CalorieRules>({ tdee: { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }, goal_adjust: { lose_fat: -500, build_muscle: 300, maintain: 0 }, protein_per_kg: 2 });
  const [freeLimit, setFreeLimit] = useState(1);

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      const get = (k: string) => data?.find((x: any) => x.key === k)?.value;
      if (get("app_name")) setAppName(get("app_name") as string);
      if (get("pricing")) setPricing(get("pricing") as any);
      if (get("plans_enabled")) setEnabled(get("plans_enabled") as any);
      if (get("calorie_rules")) setRules(get("calorie_rules") as any);
      if (get("free_plan_limit") != null) setFreeLimit(get("free_plan_limit") as number);
    });
  }, []);

  async function saveAll() {
    const rows = [
      { key: "app_name", value: appName as any },
      { key: "pricing", value: pricing as any },
      { key: "plans_enabled", value: enabled as any },
      { key: "calorie_rules", value: rules as any },
      { key: "free_plan_limit", value: freeLimit as any },
    ];
    for (const r of rows) {
      const { error } = await supabase.from("app_settings").upsert(r);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Saved");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">App settings</h1>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Branding</h2>
        <div className="space-y-1.5"><Label>App name</Label><Input value={appName} onChange={e=>setAppName(e.target.value)} /></div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Pricing (USD / month)</h2>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Pro</Label><Input inputMode="decimal" value={pricing.pro} onChange={e=>setPricing({...pricing,pro:Number(e.target.value)})} /></div>
          <div><Label>Premium</Label><Input inputMode="decimal" value={pricing.premium} onChange={e=>setPricing({...pricing,premium:Number(e.target.value)})} /></div>
          <div><Label>Elite</Label><Input inputMode="decimal" value={pricing.elite} onChange={e=>setPricing({...pricing,elite:Number(e.target.value)})} /></div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Plans enabled</h2>
        <div className="flex flex-wrap gap-4">
          {(["free","pro","premium","elite"] as const).map(k => (
            <label key={k} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={enabled[k]} onChange={e=>setEnabled({...enabled,[k]:e.target.checked})} />{k}</label>
          ))}
        </div>
        <div><Label>Free plan generation limit</Label><Input className="max-w-[120px]" inputMode="numeric" value={freeLimit} onChange={e=>setFreeLimit(Number(e.target.value))} /></div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Calorie & macro rules</h2>
        <div>
          <Label>Protein per kg bodyweight (g)</Label>
          <Input inputMode="decimal" value={rules.protein_per_kg} onChange={e=>setRules({...rules,protein_per_kg:Number(e.target.value)})} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mt-3 mb-1">TDEE multipliers</h3>
          <div className="grid grid-cols-4 gap-2">
            {(["sedentary","light","moderate","active"] as const).map(k => (
              <div key={k}><Label className="capitalize text-xs">{k}</Label><Input inputMode="decimal" value={rules.tdee[k]} onChange={e=>setRules({...rules,tdee:{...rules.tdee,[k]:Number(e.target.value)}})} /></div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mt-3 mb-1">Goal calorie adjustment</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["lose_fat","build_muscle","maintain"] as const).map(k => (
              <div key={k}><Label className="capitalize text-xs">{k.replace("_"," ")}</Label><Input inputMode="decimal" value={rules.goal_adjust[k]} onChange={e=>setRules({...rules,goal_adjust:{...rules.goal_adjust,[k]:Number(e.target.value)}})} /></div>
            ))}
          </div>
        </div>
      </section>

      <Button onClick={saveAll} className="h-11 px-6">Save all settings</Button>
    </div>
  );
}
