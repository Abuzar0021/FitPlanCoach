// Pure logic for the dashboard's "today" nudges — no fake reminders, every
// nudge is derived from data the user actually logged (or didn't).
export type Nudge = { id: "workout" | "food" | "water" | "weighin"; label: string; href: string };

export function computeNudges(input: {
  isRestDay: boolean;
  workoutDoneToday: boolean;
  foodLoggedToday: boolean;
  waterMl: number;
  waterTargetMl: number;
  daysSinceWeighIn: number | null; // null = never logged a weigh-in
}): Nudge[] {
  const nudges: Nudge[] = [];
  if (!input.isRestDay && !input.workoutDoneToday) {
    nudges.push({ id: "workout", label: "Log today's workout", href: "/workouts" });
  }
  if (!input.foodLoggedToday) {
    nudges.push({ id: "food", label: "Log what you've eaten today", href: "/food-diary" });
  }
  if (input.waterMl < input.waterTargetMl * 0.5) {
    nudges.push({ id: "water", label: "You're behind on water today", href: "/dashboard" });
  }
  if (input.daysSinceWeighIn === null || input.daysSinceWeighIn >= 7) {
    nudges.push({ id: "weighin", label: "It's been a week — log a weigh-in", href: "/progress" });
  }
  return nudges;
}
