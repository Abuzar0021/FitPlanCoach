import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Star, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Category = "breakfast" | "lunch" | "dinner" | "snack";

type FoodRow = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

export type LoggedEntry = {
  food_id: string | null;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Portion a catalog food to a gram amount. */
function portion(f: FoodRow, grams: number) {
  const ratio = grams / 100;
  return {
    calories: Math.round(f.calories_per_100g * ratio),
    protein: Math.round(f.protein_per_100g * ratio * 10) / 10,
    carbs: Math.round(f.carbs_per_100g * ratio * 10) / 10,
    fat: Math.round(f.fat_per_100g * ratio * 10) / 10,
  };
}

export function FoodEntrySheet({
  open,
  onOpenChange,
  userId,
  category,
  logged_date,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  category: Category;
  logged_date: string;
  onLogged: (entry: LoggedEntry) => void;
}) {
  const [tab, setTab] = useState<"search" | "custom">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodRow[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteFoods, setFavoriteFoods] = useState<FoodRow[]>([]);
  const [selected, setSelected] = useState<FoodRow | null>(null);
  const [grams, setGrams] = useState("100");
  const [saving, setSaving] = useState(false);

  const [customName, setCustomName] = useState("");
  const [customGrams, setCustomGrams] = useState("100");
  const [customCals, setCustomCals] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("search");
    setQuery("");
    setResults([]);
    setSelected(null);
    setGrams("100");
    setCustomName("");
    setCustomGrams("100");
    setCustomCals("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
    const db: any = supabase;
    db.from("food_favorites")
      .select(
        "food_id, foods(id,name,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)",
      )
      .eq("user_id", userId)
      .then(({ data }: any) => {
        const rows = (data ?? []) as Array<{ food_id: string; foods: FoodRow | null }>;
        setFavorites(new Set(rows.map((r) => r.food_id)));
        setFavoriteFoods(rows.map((r) => r.foods).filter((f): f is FoodRow => f != null));
      });
  }, [open, userId]);

  useEffect(() => {
    if (!open || tab !== "search") return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const db: any = supabase;
    const handle = setTimeout(() => {
      db.from("foods")
        .select("id,name,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g")
        .eq("enabled", true)
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(20)
        .then(({ data }: any) => setResults((data ?? []) as FoodRow[]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open, tab]);

  async function toggleFavorite(food: FoodRow, e: React.MouseEvent) {
    e.stopPropagation();
    const db: any = supabase;
    if (favorites.has(food.id)) {
      await db.from("food_favorites").delete().eq("user_id", userId).eq("food_id", food.id);
      setFavorites((f) => {
        const next = new Set(f);
        next.delete(food.id);
        return next;
      });
      setFavoriteFoods((list) => list.filter((x) => x.id !== food.id));
    } else {
      await db.from("food_favorites").insert({ user_id: userId, food_id: food.id });
      setFavorites((f) => new Set(f).add(food.id));
      setFavoriteFoods((list) => [...list, food]);
    }
  }

  async function confirmCatalog() {
    if (!selected) return;
    const g = Number(grams);
    if (!g || g <= 0 || g > 5000) {
      toast.error("Enter a realistic gram amount");
      return;
    }
    setSaving(true);
    try {
      const p = portion(selected, g);
      const { error } = await supabase.from("food_log_entries").insert({
        user_id: userId,
        logged_date,
        meal_category: category,
        food_id: selected.id,
        name: selected.name,
        grams: g,
        ...p,
      });
      if (error) throw error;
      onLogged({ food_id: selected.id, name: selected.name, grams: g, ...p });
      toast.success(`Logged ${selected.name}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log that food");
    } finally {
      setSaving(false);
    }
  }

  async function confirmCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("Name is required");
      return;
    }
    const g = Number(customGrams) || 0;
    const cals = Number(customCals) || 0;
    const protein = Number(customProtein) || 0;
    const carbs = Number(customCarbs) || 0;
    const fat = Number(customFat) || 0;
    if (g <= 0 || g > 5000 || cals < 0 || cals > 9000) {
      toast.error("Enter realistic values");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("food_log_entries").insert({
        user_id: userId,
        logged_date,
        meal_category: category,
        food_id: null,
        name: customName.trim(),
        grams: g,
        calories: cals,
        protein,
        carbs,
        fat,
      });
      if (error) throw error;
      onLogged({
        food_id: null,
        name: customName.trim(),
        grams: g,
        calories: cals,
        protein,
        carbs,
        fat,
      });
      toast.success(`Logged ${customName.trim()}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log that entry");
    } finally {
      setSaving(false);
    }
  }

  const showFavorites = tab === "search" && !query.trim() && favoriteFoods.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display uppercase italic text-xl">
            Log to {category}
          </SheetTitle>
          <SheetDescription>Search the catalog or add a custom entry.</SheetDescription>
        </SheetHeader>

        <div className="flex gap-2 mt-4 mb-3">
          <button
            onClick={() => {
              setTab("search");
              setSelected(null);
            }}
            className={`flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === "search" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Search
          </button>
          <button
            onClick={() => {
              setTab("custom");
              setSelected(null);
            }}
            className={`flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Custom
          </button>
        </div>

        {tab === "search" && !selected && (
          <div className="space-y-3 pb-4">
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="pl-9"
                autoFocus
              />
            </div>

            {showFavorites && (
              <div>
                <p className="label-overline mb-1.5">Favorites</p>
                <div className="space-y-1.5">
                  {favoriteFoods.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className="w-full surface-card p-3 flex items-center justify-between gap-3 text-left hover:border-primary/40 transition"
                    >
                      <span className="font-medium truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {f.calories_per_100g} kcal/100g
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.trim() && (
              <div className="space-y-1.5">
                {results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No foods match "{query}"
                  </p>
                )}
                {results.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className="w-full surface-card p-3 flex items-center justify-between gap-3 text-left hover:border-primary/40 transition"
                  >
                    <span className="font-medium truncate">{f.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {f.calories_per_100g} kcal/100g
                      </span>
                      <Star
                        onClick={(e) => toggleFavorite(f, e)}
                        className={`size-4 ${favorites.has(f.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "search" && selected && (
          <div className="space-y-4 pb-4">
            <div className="surface-card p-4">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.calories_per_100g} kcal · {selected.protein_per_100g}g protein / 100g
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="label-overline">Amount (grams)</label>
              <Input
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                autoFocus
              />
            </div>
            {Number(grams) > 0 && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {(() => {
                  const p = portion(selected, Number(grams));
                  return (
                    <>
                      <div className="metric-card py-2.5">
                        <p className="text-sm font-display tabular-nums">{p.calories}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">kcal</p>
                      </div>
                      <div className="metric-card py-2.5">
                        <p className="text-sm font-display tabular-nums">{p.protein}g</p>
                        <p className="text-[9px] text-muted-foreground uppercase">protein</p>
                      </div>
                      <div className="metric-card py-2.5">
                        <p className="text-sm font-display tabular-nums">{p.carbs}g</p>
                        <p className="text-[9px] text-muted-foreground uppercase">carbs</p>
                      </div>
                      <div className="metric-card py-2.5">
                        <p className="text-sm font-display tabular-nums">{p.fat}g</p>
                        <p className="text-[9px] text-muted-foreground uppercase">fat</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={confirmCatalog} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Log it"}
              </Button>
            </div>
          </div>
        )}

        {tab === "custom" && (
          <form onSubmit={confirmCustom} className="space-y-3 pb-4">
            <div className="space-y-1.5">
              <label className="label-overline">Name</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Homemade smoothie"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="label-overline">Grams</label>
                <Input
                  inputMode="decimal"
                  value={customGrams}
                  onChange={(e) => setCustomGrams(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-overline">Calories</label>
                <Input
                  inputMode="decimal"
                  value={customCals}
                  onChange={(e) => setCustomCals(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-overline">Protein (g)</label>
                <Input
                  inputMode="decimal"
                  value={customProtein}
                  onChange={(e) => setCustomProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-overline">Carbs (g)</label>
                <Input
                  inputMode="decimal"
                  value={customCarbs}
                  onChange={(e) => setCustomCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-overline">Fat (g)</label>
                <Input
                  inputMode="decimal"
                  value={customFat}
                  onChange={(e) => setCustomFat(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Log it"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
