// Workout schedules sometimes display a decorated exercise name (e.g. "Push-Up
// (knee or full)", "Pull-Up (assisted if needed)") that doesn't exactly match
// the canonical name in the exercises reference table. Strip parenthetical
// and "/"-alternative suffixes to recover the base exercise for a lookup.
export function normalizeExerciseName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .split("/")[0]
    .trim();
}
