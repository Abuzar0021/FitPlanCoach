import { test } from "node:test";
import assert from "node:assert/strict";
import { localDateKey, daysBetweenKeys, shiftDateKey } from "./date.ts";

test("localDateKey — formats as YYYY-MM-DD using local date parts", () => {
  const d = new Date(2026, 0, 5); // Jan 5, 2026, local time — month is 0-indexed
  assert.equal(localDateKey(d), "2026-01-05");
});

test("localDateKey — pads single-digit month and day", () => {
  const d = new Date(2026, 8, 3); // Sep 3, 2026
  assert.equal(localDateKey(d), "2026-09-03");
});

test("daysBetweenKeys — same day is 0", () => {
  assert.equal(daysBetweenKeys("2026-06-15", "2026-06-15"), 0);
});

test("daysBetweenKeys — consecutive days is 1", () => {
  assert.equal(daysBetweenKeys("2026-06-15", "2026-06-16"), 1);
});

test("daysBetweenKeys — handles month boundaries", () => {
  assert.equal(daysBetweenKeys("2026-01-31", "2026-02-01"), 1);
});

test("daysBetweenKeys — negative when b is before a", () => {
  assert.equal(daysBetweenKeys("2026-06-16", "2026-06-15"), -1);
});

test("shiftDateKey — +1 day advances the calendar date", () => {
  assert.equal(shiftDateKey("2026-06-15", 1), "2026-06-16");
});

test("shiftDateKey — -1 day goes back a date", () => {
  assert.equal(shiftDateKey("2026-06-15", -1), "2026-06-14");
});

test("shiftDateKey — handles month/year boundaries", () => {
  assert.equal(shiftDateKey("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDateKey("2026-01-01", -1), "2025-12-31");
});
