import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExerciseName } from "./exercise-name.ts";

test("normalizeExerciseName — strips a trailing parenthetical", () => {
  assert.equal(normalizeExerciseName("Push-Up (knee or full)"), "Push-Up");
  assert.equal(normalizeExerciseName("Pull-Up (assisted if needed)"), "Pull-Up");
});

test("normalizeExerciseName — takes the first option of a slash alternative", () => {
  assert.equal(normalizeExerciseName("Brisk Walk / Incline Treadmill"), "Brisk Walk");
});

test("normalizeExerciseName — leaves an already-clean name untouched", () => {
  assert.equal(normalizeExerciseName("Barbell Back Squat"), "Barbell Back Squat");
});

test("normalizeExerciseName — handles a compound circuit description gracefully", () => {
  // Circuits aren't single exercises — this just needs to not throw; the
  // caller treats "no exercises-table match" as expected for these.
  assert.equal(normalizeExerciseName("Circuit: Burpees / KB Swings / Rowing"), "Circuit: Burpees");
});
