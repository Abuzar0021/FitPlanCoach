import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMealAlternatives, swapMealItem } from "@/lib/plan-generation.functions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, Utensils } from "lucide-react";

type Category = "breakfast" | "lunch" | "dinner" | "snack";
type Option = {
  food_id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function MealAlternativesSheet({
  open,
  onOpenChange,
  category,
  index,
  currentName,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  index: number | null;
  currentName: string;
  onApplied: (item: Option) => void;
}) {
  const getAlternatives = useServerFn(getMealAlternatives);
  const doSwap = useServerFn(swapMealItem);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!open || category === null || index === null) return;
    setLoading(true);
    setError(null);
    setOptions([]);
    getAlternatives({ data: { category, index } })
      .then((res) => {
        if (res.ok) setOptions(res.options);
        else setError(res.message);
      })
      .catch(() => setError("Could not load alternatives right now."))
      .finally(() => setLoading(false));
  }, [open, category, index]);

  async function apply(option: Option) {
    if (category === null || index === null) return;
    setApplying(option.food_id);
    try {
      const res = await doSwap({ data: { category, index, food_id: option.food_id } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onApplied(res.item);
      toast.success(`Swapped to ${res.item.name}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply that swap");
    } finally {
      setApplying(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display uppercase italic text-xl">Alternatives</SheetTitle>
          <SheetDescription>Swap out "{currentName}" for one of these instead.</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="space-y-2 mt-4">
            <div className="h-16 bg-muted rounded-2xl animate-pulse" />
            <div className="h-16 bg-muted rounded-2xl animate-pulse" />
            <div className="h-16 bg-muted rounded-2xl animate-pulse" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 text-center text-sm text-muted-foreground py-6">
            <Utensils className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            {error}
          </div>
        )}

        {!loading && !error && options.length > 0 && (
          <div className="mt-4 space-y-2 pb-4">
            {options.map((o) => (
              <button
                key={o.food_id}
                onClick={() => apply(o)}
                disabled={applying !== null}
                className="w-full surface-card p-3.5 flex items-center justify-between gap-3 text-left hover:border-primary/40 transition disabled:opacity-60"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.name}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">
                    {o.grams}g · {o.carbs}c · {o.fat}f
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-display tabular-nums">
                      {o.calories} <span className="text-[10px] text-muted-foreground">kcal</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-primary tabular-nums">
                      {o.protein}g protein
                    </div>
                  </div>
                  {applying === o.food_id && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
