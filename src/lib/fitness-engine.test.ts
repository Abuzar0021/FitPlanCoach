// Unit tests for the pure rule-based fitness engine.
//
// Runs on Node's built-in test runner with TypeScript type-stripping — no test
// framework dependency, so it can't conflict with the pinned Vite/toolchain:
//   node --test --experimental-strip-types src/lib/fitness-engine.test.ts
// (see package.json "test" script). The engine has no imports, so it strips and
// loads cleanly via the relative import below.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bmr,
  calorieTargets,
  generateMealPlan,
  pickWorkoutTemplate,
  adaptScheduleForHome,
  HOME_SUBSTITUTIONS,
  DEFAULT_RULES,
  type UserStats,
  type Food,
  type WorkoutTemplate,
} from "./fitness-engine.ts";

const male: UserStats = {
  age: 30,
  gender: "male",
  height_cm: 180,
  weight_kg: 80,
  activity_level: "moderate",
  goal: "lose_fat",
};

test("bmr — Mifflin–St Jeor, male adds +5", () => {
  // 10*80 + 6.25*180 - 5*30 + 5 = 1780
  assert.equal(bmr(male), 1780);
});

test("bmr — female subtracts 161", () => {
  assert.equal(bmr({ ...male, gender: "female" }), 1614);
});

test("bmr — 'other' uses the female constant (safer/lower)", () => {
  assert.equal(bmr({ ...male, gender: "other" }), bmr({ ...male, gender: "female" }));
});

test("calorieTargets — applies activity multiplier, goal adjust, protein/kg", () => {
  const r = calorieTargets(male);
  // tdee = 1780 * 1.55 = 2759; target = round(2759 - 500) = 2259
  assert.equal(r.bmr, 1780);
  assert.equal(r.tdee, 2759);
  assert.equal(r.calories, 2259);
  assert.equal(r.protein, 160); // 2 g/kg * 80
});

test("calorieTargets — never drops below the 1200 kcal floor", () => {
  const tiny: UserStats = {
    age: 80,
    gender: "female",
    height_cm: 150,
    weight_kg: 40,
    activity_level: "sedentary",
    goal: "lose_fat",
  };
  const r = calorieTargets(tiny);
  assert.equal(r.calories, 1200);
});

test("calorieTargets — build_muscle adds a surplus over maintain", () => {
  const gain = calorieTargets({ ...male, goal: "build_muscle" }).calories;
  const maintain = calorieTargets({ ...male, goal: "maintain" }).calories;
  assert.equal(gain - maintain, DEFAULT_RULES.goal_adjust.build_muscle);
});

const foods: Food[] = [
  {
    id: "b1",
    name: "Oats (local)",
    country: "pk",
    calories_per_100g: 380,
    protein_per_100g: 13,
    category: "breakfast",
    budget_level: "low",
  },
  {
    id: "b2",
    name: "Eggs (local)",
    country: "pk",
    calories_per_100g: 155,
    protein_per_100g: 13,
    category: "breakfast",
    budget_level: "low",
  },
  {
    id: "l1",
    name: "Rice (global)",
    country: "global",
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    category: "lunch",
    budget_level: "low",
  },
  {
    id: "l2",
    name: "Chicken (global)",
    country: "global",
    calories_per_100g: 165,
    protein_per_100g: 31,
    category: "lunch",
    budget_level: "low",
  },
  {
    id: "d1",
    name: "Fish (global)",
    country: "global",
    calories_per_100g: 206,
    protein_per_100g: 22,
    category: "dinner",
    budget_level: "low",
  },
  {
    id: "d2",
    name: "Lentils (global)",
    country: "global",
    calories_per_100g: 116,
    protein_per_100g: 9,
    category: "dinner",
    budget_level: "low",
  },
  {
    id: "s1",
    name: "Yogurt (global)",
    country: "global",
    calories_per_100g: 59,
    protein_per_100g: 10,
    category: "snack",
    budget_level: "low",
  },
];

test("generateMealPlan — produces all four meals with sane portions", () => {
  const plan = generateMealPlan(male, "pk", "low", foods);
  for (const cat of ["breakfast", "lunch", "dinner", "snack"] as const) {
    assert.ok(plan.meals[cat].length > 0, `${cat} should have items`);
    for (const item of plan.meals[cat]) {
      assert.ok(item.grams >= 20, "grams clamped to >= 20");
      assert.ok(item.calories > 0);
    }
  }
  assert.equal(plan.calories_target, calorieTargets(male).calories);
  assert.ok(plan.totals.calories > 0);
});

test("generateMealPlan — prefers local-country foods when available", () => {
  const plan = generateMealPlan(male, "pk", "low", foods);
  // Both breakfast foods exist locally for 'pk' and should be chosen over global.
  const names = plan.meals.breakfast.map((m) => m.name);
  assert.ok(
    names.every((n) => n.includes("local")),
    `expected local breakfast, got ${names}`,
  );
});

test("generateMealPlan — falls back to global when no local foods exist", () => {
  const plan = generateMealPlan(male, "zz", "low", foods); // 'zz' has no local foods
  assert.ok(plan.meals.lunch.length > 0, "global lunch fallback");
  assert.ok(plan.meals.lunch.every((m) => m.name.includes("global")));
});

test("generateMealPlan — empty catalog yields empty meals, never throws", () => {
  const plan = generateMealPlan(male, "pk", "low", []);
  assert.equal(plan.meals.breakfast.length, 0);
  assert.equal(plan.totals.calories, 0);
});

const templates: WorkoutTemplate[] = [
  { id: "t1", name: "Cut Beginner", goal: "lose_fat", level: "beginner", schedule: {} },
  { id: "t2", name: "Cut Advanced", goal: "lose_fat", level: "advanced", schedule: {} },
  {
    id: "t3",
    name: "Bulk Intermediate",
    goal: "build_muscle",
    level: "intermediate",
    schedule: {},
  },
];

test("pickWorkoutTemplate — maps activity to level (sedentary -> beginner)", () => {
  const t = pickWorkoutTemplate("lose_fat", "sedentary", templates);
  assert.equal(t?.id, "t1");
});

test("pickWorkoutTemplate — active maps to advanced", () => {
  const t = pickWorkoutTemplate("lose_fat", "active", templates);
  assert.equal(t?.id, "t2");
});

test("pickWorkoutTemplate — maintain can borrow a lose_fat template", () => {
  const t = pickWorkoutTemplate("maintain", "moderate", templates);
  assert.ok(t && t.goal === "lose_fat");
});

test("pickWorkoutTemplate — returns null when no templates exist", () => {
  assert.equal(pickWorkoutTemplate("lose_fat", "moderate", []), null);
});

test("pickWorkoutTemplate — explicit level overrides activity-derived guess", () => {
  // sedentary would normally map to beginner (t1); an explicit "advanced"
  // choice should win instead.
  const t = pickWorkoutTemplate("lose_fat", "sedentary", templates, "advanced");
  assert.equal(t?.id, "t2");
});

test("adaptScheduleForHome — no-op for gym users", () => {
  const schedule = [{ day: "Mon", items: [{ name: "Barbell Back Squat" }] }];
  const out = adaptScheduleForHome(schedule, "gym", ["dumbbells"]);
  assert.equal(out[0].items[0].name, "Barbell Back Squat");
});

test("adaptScheduleForHome — substitutes to dumbbell when owned", () => {
  const schedule = [{ day: "Mon", items: [{ name: "Barbell Back Squat" }] }];
  const out = adaptScheduleForHome(schedule, "home", ["dumbbells"]);
  assert.equal(out[0].items[0].name, "Goblet Squat");
});

test("adaptScheduleForHome — falls back to bodyweight when no equipment owned", () => {
  const schedule = [{ day: "Mon", items: [{ name: "Barbell Bench Press" }] }];
  const out = adaptScheduleForHome(schedule, "home", []);
  assert.equal(out[0].items[0].name, "Push-Up");
});

test("adaptScheduleForHome — never recommends equipment the user doesn't have", () => {
  const gymOnlyNames = new Set(
    Object.keys(HOME_SUBSTITUTIONS).flatMap((k) => {
      const sub = HOME_SUBSTITUTIONS[k];
      return [sub.dumbbell, sub.band].filter(Boolean) as string[];
    }),
  );
  const schedule = [
    { day: "Mon", items: Object.keys(HOME_SUBSTITUTIONS).map((name) => ({ name })) },
  ];
  const out = adaptScheduleForHome(schedule, "home", []);
  for (const item of out[0].items) {
    assert.ok(!gymOnlyNames.has(item.name), `${item.name} requires equipment the user lacks`);
  }
});

test("adaptScheduleForHome — leaves already home-friendly exercises untouched", () => {
  const schedule = [{ day: "Mon", items: [{ name: "Push-Up" }] }];
  const out = adaptScheduleForHome(schedule, "home", []);
  assert.equal(out[0].items[0].name, "Push-Up");
});
