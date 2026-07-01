import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localDateKey } from "@/lib/date";
import { waterTargetMl } from "@/lib/water";
import { toast } from "sonner";
import { Droplet, Undo2 } from "lucide-react";

const QUICK_ADDS = [250, 500] as const;

export function WaterTracker({ userId, weightKg }: { userId: string; weightKg: number | null }) {
  const [totalMl, setTotalMl] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const db: any = supabase;
    const { data } = await db
      .from("water_logs")
      .select("id,amount_ml,created_at")
      .eq("user_id", userId)
      .eq("logged_date", localDateKey())
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Array<{ id: string; amount_ml: number }>;
    setTotalMl(rows.reduce((a, r) => a + r.amount_ml, 0));
    setLastId(rows[0]?.id ?? null);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function add(ml: number) {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("water_logs")
        .insert({ user_id: userId, logged_date: localDateKey(), amount_ml: ml })
        .select("id")
        .single();
      if (error) throw error;
      setTotalMl((t) => (t ?? 0) + ml);
      setLastId(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log water");
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    if (!lastId) return;
    setBusy(true);
    try {
      await supabase.from("water_logs").delete().eq("id", lastId);
      load();
    } finally {
      setBusy(false);
    }
  }

  const target = waterTargetMl(weightKg);
  const pct = totalMl != null ? Math.min(100, Math.round((totalMl / target) * 100)) : 0;

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-1.5">
        <p className="label-overline inline-flex items-center gap-1">
          <Droplet className="size-3 text-sky-500" /> Water
        </p>
        {lastId && (
          <button
            onClick={undoLast}
            disabled={busy}
            aria-label="Undo last water log"
            className="text-muted-foreground hover:text-foreground transition disabled:opacity-50"
          >
            <Undo2 className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-lg font-display tabular-nums mt-0.5">
        {((totalMl ?? 0) / 1000).toFixed(2)}
        <span className="text-[10px] text-muted-foreground ml-1">
          / {(target / 1000).toFixed(1)}L
        </span>
      </p>
      <div className="h-1.5 bg-muted rounded-full mt-2 mb-2.5 overflow-hidden">
        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-1.5">
        {QUICK_ADDS.map((ml) => (
          <button
            key={ml}
            onClick={() => add(ml)}
            disabled={busy}
            className="flex-1 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider hover:bg-sky-500/20 transition disabled:opacity-50"
          >
            +{ml}ml
          </button>
        ))}
      </div>
    </div>
  );
}
