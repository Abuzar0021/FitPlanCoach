import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { PlanScreenSkeleton } from "@/components/app-ui";
import { FoodEntrySheet } from "@/components/FoodEntrySheet";
import { localDateKey, shiftDateKey } from "@/lib/date";

export const Route = createFileRoute("/_app/food-diary")({
  head: () => ({
    meta: [{ title: "Food Diary — FitPlanCoach" }, { name: "robots", content: "noindex,follow" }],
  }),
  component: FoodDiary,
});

type Category = "breakfast" | "lunch" | "dinner" | "snack";
type Entry = {
  id: string;
  meal_category: Category;
  food_id: string | null;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const CATEGORIES: Category[] = ["breakfast", "lunch", "dinner", "snack"];
const EMOJI: Record<Category, string> = { breakfast: "🍳", lunch: "🥗", dinner: "🍲", snack: "🍎" };

function FoodDiary() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => localDateKey());
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [targets, setTargets] = useState<{
    calories: number;
    protein: number;
    carbs: number | null;
    fat: number | null;
  } | null>(null);
  const [addFor, setAddFor] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState("");

  async function loadEntries() {
    if (!user) return;
    const db: any = supabase;
    const { data } = await db
      .from("food_log_entries")
      .select("id,meal_category,food_id,name,grams,calories,protein,carbs,fat")
      .eq("user_id", user.id)
      .eq("logged_date", date)
      .order("created_at");
    setEntries((data ?? []) as Entry[]);
  }

  useEffect(() => {
    setEntries(null);
    loadEntries();
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    const db: any = supabase;
    db.from("meal_plans")
      .select("calories_target,protein_target,carbs_target,fat_target")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setTargets({
            calories: data.calories_target,
            protein: data.protein_target,
            carbs: data.carbs_target,
            fat: data.fat_target,
          });
        }
      });
  }, [user]);

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const e of entries ?? []) {
      t.calories += e.calories;
      t.protein += e.protein;
      t.carbs += e.carbs;
      t.fat += e.fat;
    }
    return t;
  }, [entries]);

  const byCategory = useMemo(() => {
    const map: Record<Category, Entry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries ?? []) map[e.meal_category].push(e);
    return map;
  }, [entries]);

  function onLogged() {
    // Re-fetch so edit/delete/duplicate operate on the server-assigned id.
    loadEntries();
  }

  async function deleteEntry(id: string) {
    setEntries((cur) => (cur ?? []).filter((e) => e.id !== id));
    const { error } = await supabase.from("food_log_entries").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete — refreshing");
      loadEntries();
    }
  }

  async function duplicateEntry(e: Entry) {
    if (!user) return;
    const { data, error } = await supabase
      .from("food_log_entries")
      .insert({
        user_id: user.id,
        logged_date: date,
        meal_category: e.meal_category,
        food_id: e.food_id,
        name: e.name,
        grams: e.grams,
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not duplicate that entry");
      return;
    }
    setEntries((cur) => [...(cur ?? []), { ...e, id: data.id }]);
    toast.success(`Duplicated ${e.name}`);
  }

  function startEdit(e: Entry) {
    setEditingId(e.id);
    setEditGrams(String(e.grams));
  }

  async function saveEdit(e: Entry) {
    const newGrams = Number(editGrams);
    if (!newGrams || newGrams <= 0 || newGrams > 5000) {
      toast.error("Enter a realistic gram amount");
      return;
    }
    const ratio = newGrams / e.grams;
    const patch = {
      grams: newGrams,
      calories: Math.round(e.calories * ratio),
      protein: Math.round(e.protein * ratio * 10) / 10,
      carbs: Math.round(e.carbs * ratio * 10) / 10,
      fat: Math.round(e.fat * ratio * 10) / 10,
    };
    const { error } = await supabase.from("food_log_entries").update(patch).eq("id", e.id);
    if (error) {
      toast.error("Could not save that change");
      return;
    }
    setEntries((cur) => (cur ?? []).map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
    setEditingId(null);
  }

  const isToday = date === localDateKey();

  return (
    <MobileShell>
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/meals"
          aria-label="Back to meal plan"
          className="size-9 rounded-xl bg-card border border-border inline-flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="label-overline">Track</p>
          <h1 className="text-2xl font-display uppercase italic truncate">Food Diary</h1>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 surface-card p-2">
        <button
          onClick={() => setDate((d) => shiftDateKey(d, -1))}
          aria-label="Previous day"
          className="size-9 rounded-lg inline-flex items-center justify-center hover:bg-muted transition"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="font-display text-sm uppercase italic">
            {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          {!isToday && (
            <button
              onClick={() => setDate(localDateKey())}
              className="text-[10px] font-bold uppercase tracking-widest text-primary"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          onClick={() => setDate((d) => shiftDateKey(d, 1))}
          aria-label="Next day"
          className="size-9 rounded-lg inline-flex items-center justify-center hover:bg-muted transition"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {entries === null ? (
        <PlanScreenSkeleton />
      ) : (
        <>
          <div className="surface-card mb-5 p-5 grid grid-cols-2 gap-4">
            {(
              [
                {
                  label: "Calories",
                  total: totals.calories,
                  target: targets?.calories ?? null,
                  unit: "",
                  bar: "bg-primary",
                },
                {
                  label: "Protein",
                  total: totals.protein,
                  target: targets?.protein ?? null,
                  unit: "g",
                  bar: "bg-accent",
                },
                {
                  label: "Carbs",
                  total: totals.carbs,
                  target: targets?.carbs ?? null,
                  unit: "g",
                  bar: "bg-warning",
                },
                {
                  label: "Fat",
                  total: totals.fat,
                  target: targets?.fat ?? null,
                  unit: "g",
                  bar: "bg-destructive",
                },
              ] as const
            ).map((r) => (
              <div key={r.label}>
                <p className="label-overline">{r.label}</p>
                <p className="text-2xl font-display tabular-nums mt-0.5">
                  {Math.round(r.total * 10) / 10}
                  {r.unit}
                  {r.target != null && (
                    <span className="text-xs text-muted-foreground font-sans">
                      {" "}
                      / {r.target}
                      {r.unit}
                    </span>
                  )}
                </p>
                {r.target != null && (
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${r.bar} rounded-full`}
                      style={{ width: `${Math.min(100, (r.total / r.target) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {CATEGORIES.map((cat) => {
            const items = byCategory[cat];
            return (
              <section key={cat} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{EMOJI[cat]}</span>
                    <h2 className="font-display text-base uppercase italic tracking-wide">{cat}</h2>
                  </div>
                  <button
                    onClick={() => setAddFor(cat)}
                    className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary inline-flex items-center justify-center hover:bg-primary/20 transition"
                    aria-label={`Add food to ${cat}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="surface-card p-4 text-sm text-muted-foreground text-center">
                    Nothing logged yet
                  </div>
                ) : (
                  <div className="surface-card divide-y divide-border overflow-hidden">
                    {items.map((e) => (
                      <div key={e.id} className="p-3.5">
                        {editingId === e.id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate flex-1 text-sm">{e.name}</span>
                            <Input
                              inputMode="decimal"
                              value={editGrams}
                              onChange={(ev) => setEditGrams(ev.target.value)}
                              className="h-8 w-20 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(e)}
                              aria-label="Save"
                              className="size-8 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center shrink-0"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel"
                              className="size-8 rounded-lg bg-muted inline-flex items-center justify-center shrink-0"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{e.name}</div>
                              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                {e.grams}g · {e.calories} kcal · {e.protein}p / {e.carbs}c / {e.fat}
                                f
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(e)}
                                aria-label={`Edit ${e.name}`}
                                className="size-7 rounded-lg text-muted-foreground hover:bg-muted inline-flex items-center justify-center transition"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => duplicateEntry(e)}
                                aria-label={`Duplicate ${e.name}`}
                                className="size-7 rounded-lg text-muted-foreground hover:bg-muted inline-flex items-center justify-center transition"
                              >
                                <Copy className="size-3.5" />
                              </button>
                              <button
                                onClick={() => deleteEntry(e.id)}
                                aria-label={`Delete ${e.name}`}
                                className="size-7 rounded-lg text-destructive hover:bg-destructive/10 inline-flex items-center justify-center transition"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {user && addFor && (
        <FoodEntrySheet
          open={addFor !== null}
          onOpenChange={(open) => !open && setAddFor(null)}
          userId={user.id}
          category={addFor}
          logged_date={date}
          onLogged={onLogged}
        />
      )}
    </MobileShell>
  );
}
