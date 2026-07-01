import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNudges } from "./nudges.ts";

const allDone = {
  isRestDay: false,
  workoutDoneToday: true,
  foodLoggedToday: true,
  waterMl: 3000,
  waterTargetMl: 2500,
  daysSinceWeighIn: 2,
};

test("computeNudges — nothing outstanding produces no nudges", () => {
  assert.deepEqual(computeNudges(allDone), []);
});

test("computeNudges — rest day never nudges for a missed workout", () => {
  const nudges = computeNudges({ ...allDone, isRestDay: true, workoutDoneToday: false });
  assert.ok(!nudges.some((n) => n.id === "workout"));
});

test("computeNudges — training day with no session logged nudges for a workout", () => {
  const nudges = computeNudges({ ...allDone, isRestDay: false, workoutDoneToday: false });
  assert.ok(nudges.some((n) => n.id === "workout"));
});

test("computeNudges — no food logged nudges for food", () => {
  const nudges = computeNudges({ ...allDone, foodLoggedToday: false });
  assert.ok(nudges.some((n) => n.id === "food"));
});

test("computeNudges — under half the water target nudges for water", () => {
  const nudges = computeNudges({ ...allDone, waterMl: 1000, waterTargetMl: 2500 });
  assert.ok(nudges.some((n) => n.id === "water"));
});

test("computeNudges — at or above half the water target does not nudge", () => {
  const nudges = computeNudges({ ...allDone, waterMl: 1250, waterTargetMl: 2500 });
  assert.ok(!nudges.some((n) => n.id === "water"));
});

test("computeNudges — never weighed in nudges for a weigh-in", () => {
  const nudges = computeNudges({ ...allDone, daysSinceWeighIn: null });
  assert.ok(nudges.some((n) => n.id === "weighin"));
});

test("computeNudges — 7+ days since last weigh-in nudges again", () => {
  const nudges = computeNudges({ ...allDone, daysSinceWeighIn: 7 });
  assert.ok(nudges.some((n) => n.id === "weighin"));
});

test("computeNudges — under 7 days since weigh-in does not nudge", () => {
  const nudges = computeNudges({ ...allDone, daysSinceWeighIn: 6 });
  assert.ok(!nudges.some((n) => n.id === "weighin"));
});
