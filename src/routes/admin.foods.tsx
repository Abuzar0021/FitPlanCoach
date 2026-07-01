import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/CountrySelect";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/foods")({
  head: () => ({ meta: [{ title: "Foods — Admin" }] }),
  component: FoodsAdmin,
});

type Food = {
  id: string;
  name: string;
  country: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category: string;
  budget_level: string;
  enabled: boolean;
};

const empty = {
  name: "",
  country: "global",
  calories_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  fiber_per_100g: "",
  category: "lunch",
  budget_level: "medium",
};

function FoodsAdmin() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [f, setF] = useState<typeof empty>(empty);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("foods").select("*").order("name");
    setFoods((data ?? []) as Food[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("foods").insert({
      name: f.name,
      country: f.country,
      calories_per_100g: Number(f.calories_per_100g),
      protein_per_100g: Number(f.protein_per_100g),
      carbs_per_100g: Number(f.carbs_per_100g) || 0,
      fat_per_100g: Number(f.fat_per_100g) || 0,
      fiber_per_100g: Number(f.fiber_per_100g) || 0,
      category: f.category as any,
      budget_level: f.budget_level as any,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setF(empty);
    toast.success("Added");
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this food?")) return;
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }
  async function toggle(id: string, enabled: boolean) {
    await supabase.from("foods").update({ enabled: !enabled }).eq("id", id);
    load();
  }

  const filtered = foods.filter(
    (x) =>
      !q ||
      x.name.toLowerCase().includes(q.toLowerCase()) ||
      x.country.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        title={
          <>
            Foods{" "}
            <span className="text-sm text-muted-foreground font-normal">({foods.length})</span>
          </>
        }
      />
      <form
        onSubmit={add}
        className="surface-card p-4 grid grid-cols-2 md:grid-cols-7 gap-2 items-end"
      >
        <div className="col-span-2">
          <label className="text-xs">Name</label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs">Country</label>
          <CountrySelect value={f.country} onChange={(country) => setF({ ...f, country })} />
        </div>
        <div>
          <label className="text-xs">kcal/100g</label>
          <Input
            inputMode="decimal"
            value={f.calories_per_100g}
            onChange={(e) => setF({ ...f, calories_per_100g: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs">protein/100g</label>
          <Input
            inputMode="decimal"
            value={f.protein_per_100g}
            onChange={(e) => setF({ ...f, protein_per_100g: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs">carbs/100g</label>
          <Input
            inputMode="decimal"
            value={f.carbs_per_100g}
            onChange={(e) => setF({ ...f, carbs_per_100g: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs">fat/100g</label>
          <Input
            inputMode="decimal"
            value={f.fat_per_100g}
            onChange={(e) => setF({ ...f, fat_per_100g: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs">fiber/100g</label>
          <Input
            inputMode="decimal"
            value={f.fiber_per_100g}
            onChange={(e) => setF({ ...f, fiber_per_100g: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs">Category</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {["breakfast", "lunch", "dinner", "snack"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs">Budget</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={f.budget_level}
            onChange={(e) => setF({ ...f, budget_level: e.target.value })}
          >
            {["low", "medium", "high"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-7">
          <Button type="submit" className="w-full md:w-auto">
            Add food
          </Button>
        </div>
      </form>

      <Input
        type="search"
        aria-label="Search foods"
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Country</th>
              <th className="text-right p-3">kcal</th>
              <th className="text-right p-3">protein</th>
              <th className="text-right p-3">carbs</th>
              <th className="text-right p-3">fat</th>
              <th className="text-left p-3">Cat</th>
              <th className="text-left p-3">Budget</th>
              <th className="text-center p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => (
              <tr key={x.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{x.name}</td>
                <td className="p-3">{x.country}</td>
                <td className="p-3 text-right">{x.calories_per_100g}</td>
                <td className="p-3 text-right">{x.protein_per_100g}</td>
                <td className="p-3 text-right">{x.carbs_per_100g}</td>
                <td className="p-3 text-right">{x.fat_per_100g}</td>
                <td className="p-3 capitalize">{x.category}</td>
                <td className="p-3 capitalize">{x.budget_level}</td>
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={x.enabled}
                    onChange={() => toggle(x.id, x.enabled)}
                  />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => del(x.id)} className="text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
