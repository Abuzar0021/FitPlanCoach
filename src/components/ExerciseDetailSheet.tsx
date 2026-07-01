import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeExerciseName } from "@/lib/exercise-name";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Wind, ShieldAlert, AlertTriangle, Dumbbell as DumbbellIcon } from "lucide-react";

type ExerciseDetail = {
  name: string;
  muscle_group: string;
  equipment: string | null;
  difficulty: string;
  instructions: string[];
  common_mistakes: string[];
  breathing_tip: string | null;
  safety_tip: string | null;
  image_url: string | null;
};

export function ExerciseDetailSheet({
  name,
  open,
  onOpenChange,
}: {
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open || !name) return;
    setLoading(true);
    setNotFound(false);
    setDetail(null);
    const query = normalizeExerciseName(name);
    supabase
      .from("exercises")
      .select(
        "name,muscle_group,equipment,difficulty,instructions,common_mistakes,breathing_tip,safety_tip,image_url",
      )
      .ilike("name", query)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDetail(data as ExerciseDetail);
        else setNotFound(true);
        setLoading(false);
      });
  }, [open, name]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display uppercase italic text-xl">
            {detail?.name ?? name ?? "Exercise"}
          </SheetTitle>
          {detail && (
            <SheetDescription className="capitalize">
              {detail.muscle_group} · {detail.equipment ?? "No equipment"} · {detail.difficulty}
            </SheetDescription>
          )}
        </SheetHeader>

        {loading && (
          <div className="space-y-2 mt-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/5" />
          </div>
        )}

        {!loading && notFound && (
          <div className="mt-6 text-center text-sm text-muted-foreground py-6">
            <DumbbellIcon className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            No detailed instructions for this one yet — follow your usual form cues.
          </div>
        )}

        {!loading && detail && (
          <div className="mt-4 space-y-5 pb-4">
            {detail.image_url && (
              <img
                src={detail.image_url}
                alt={`${detail.name} demonstration`}
                loading="lazy"
                className="w-full rounded-2xl border border-border object-cover aspect-video"
              />
            )}

            {detail.instructions.length > 0 && (
              <div>
                <h3 className="label-overline mb-2">How to do it</h3>
                <ol className="space-y-2">
                  {detail.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="shrink-0 size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {detail.common_mistakes.length > 0 && (
              <div>
                <h3 className="label-overline mb-2 flex items-center gap-1.5 text-warning">
                  <AlertTriangle className="size-3.5" /> Common mistakes
                </h3>
                <ul className="space-y-1.5">
                  {detail.common_mistakes.map((m, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                      • {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.breathing_tip && (
              <div className="surface-card p-3.5 flex gap-3 items-start">
                <Wind className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Breathing
                  </p>
                  <p className="text-sm mt-0.5">{detail.breathing_tip}</p>
                </div>
              </div>
            )}

            {detail.safety_tip && (
              <div className="surface-card p-3.5 flex gap-3 items-start">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Safety
                  </p>
                  <p className="text-sm mt-0.5">{detail.safety_tip}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
