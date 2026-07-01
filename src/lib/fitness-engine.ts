// Pure rule-based fitness engine. No external AI.
export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type Goal = "lose_fat" | "build_muscle" | "maintain";
export type Budget = "low" | "medium" | "high";

export interface CalorieRules {
  tdee: Record<ActivityLevel, number>;
  goal_adjust: Record<Goal, number>;
  protein_per_kg: number;
}

export const DEFAULT_RULES: CalorieRules = {
  tdee: { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 },
  goal_adjust: { lose_fat: -500, build_muscle: 300, maintain: 0 },
  protein_per_kg: 2,
};

export interface UserStats {
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
}

// Mifflin–St Jeor
export function bmr({ age, gender, height_cm, weight_kg }: UserStats): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === "male" ? base + 5 : base - 161; // 'other' uses female formula for safety
}

export function calorieTargets(s: UserStats, rules: CalorieRules = DEFAULT_RULES) {
  const b = bmr(s);
  const tdee = b * rules.tdee[s.activity_level];
  const target = Math.max(1200, Math.round(tdee + rules.goal_adjust[s.goal]));
  const protein = Math.round(rules.protein_per_kg * s.weight_kg);
  return { bmr: Math.round(b), tdee: Math.round(tdee), calories: target, protein };
}

// --- Meal plan generation ---
export interface Food {
  id: string;
  name: string;
  country: string;
  calories_per_100g: number;
  protein_per_100g: number;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  budget_level: Budget;
}

export interface MealItem {
  food_id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
}

export interface MealPlan {
  calories_target: number;
  protein_target: number;
  meals: Record<"breakfast" | "lunch" | "dinner" | "snack", MealItem[]>;
  totals: { calories: number; protein: number };
}

const MEAL_SPLIT = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 } as const;

export function pickFoods(
  foods: Food[],
  category: keyof typeof MEAL_SPLIT,
  country: string,
  budget: Budget,
): Food[] {
  const byCat = foods.filter((f) => f.category === category);
  const ofBudget = byCat.filter((f) => f.budget_level === budget);
  const local = ofBudget.filter((f) => f.country.toLowerCase() === country.toLowerCase());
  if (local.length >= 2) return local;
  const localAnyBudget = byCat.filter((f) => f.country.toLowerCase() === country.toLowerCase());
  if (localAnyBudget.length >= 2) return localAnyBudget;
  const globalBudget = ofBudget.filter((f) => f.country === "global");
  if (globalBudget.length >= 2) return globalBudget;
  return byCat.filter((f) => f.country === "global");
}

/** Portion a single food to hit a calorie target — same math generateMealPlan uses per item. */
export function portionFood(f: Food, targetCals: number): MealItem {
  const grams = Math.max(20, Math.round((targetCals / f.calories_per_100g) * 100));
  const calories = Math.round((grams * f.calories_per_100g) / 100);
  const protein = Math.round((grams * f.protein_per_100g) / 100);
  return { food_id: f.id, name: f.name, grams, calories, protein };
}

export const MEAL_CATEGORY_SPLIT = MEAL_SPLIT;

export function generateMealPlan(
  stats: UserStats,
  country: string,
  budget: Budget,
  foods: Food[],
  rules: CalorieRules = DEFAULT_RULES,
): MealPlan {
  const { calories, protein } = calorieTargets(stats, rules);
  const meals: MealPlan["meals"] = { breakfast: [], lunch: [], dinner: [], snack: [] };
  let totalCals = 0;
  let totalProtein = 0;

  for (const cat of Object.keys(MEAL_SPLIT) as Array<keyof typeof MEAL_SPLIT>) {
    const pool = pickFoods(foods, cat, country, budget);
    if (pool.length === 0) continue;
    const catCals = calories * MEAL_SPLIT[cat];
    // Pick up to 2 distinct foods, split target between them
    const chosen = pool.slice(0, Math.min(2, pool.length));
    const perItemCals = catCals / chosen.length;
    for (const f of chosen) {
      const item = portionFood(f, perItemCals);
      meals[cat].push(item);
      totalCals += item.calories;
      totalProtein += item.protein;
    }
  }

  return {
    calories_target: calories,
    protein_target: protein,
    meals,
    totals: { calories: totalCals, protein: totalProtein },
  };
}

// --- Workout selection ---
export interface WorkoutTemplate {
  id: string;
  name: string;
  goal: Goal;
  level: "beginner" | "intermediate" | "advanced";
  schedule: unknown;
}

export function pickWorkoutTemplate(
  goal: Goal,
  activity: ActivityLevel,
  templates: WorkoutTemplate[],
  explicitLevel?: "beginner" | "intermediate" | "advanced",
): WorkoutTemplate | null {
  // An explicit experience-level choice (set during onboarding) always wins
  // over the activity-derived guess.
  const level =
    explicitLevel ??
    (activity === "sedentary" || activity === "light"
      ? "beginner"
      : activity === "moderate"
        ? "intermediate"
        : "advanced");
  // Treat lose_fat templates as flexible for maintain
  const goalMatch = templates.filter(
    (t) => t.goal === goal || (goal === "maintain" && t.goal === "lose_fat"),
  );
  const exact = goalMatch.find((t) => t.level === level);
  if (exact) return exact;
  return goalMatch[0] ?? templates[0] ?? null;
}

// --- Home-equipment substitution ---
export type Equipment = "dumbbells" | "bands";

/**
 * name -> home-friendly alternatives, ordered by what's checked first
 * (dumbbell, then band, then plain bodyweight). Exercises not listed here
 * are assumed to already be home/bodyweight-friendly as-is (e.g. Push-Up,
 * Plank, Glute Bridge).
 */
export const HOME_SUBSTITUTIONS: Record<
  string,
  { dumbbell?: string; band?: string; bodyweight: string }
> = {
  "Barbell Back Squat": { dumbbell: "Goblet Squat", bodyweight: "Jump Squat" },
  "Front Squat": { dumbbell: "Goblet Squat", bodyweight: "Bulgarian Split Squat" },
  "Leg Press": { dumbbell: "Goblet Squat", bodyweight: "Bodyweight Squat" },
  "Romanian Deadlift": {
    dumbbell: "Dumbbell Romanian Deadlift",
    band: "Band Deadlift",
    bodyweight: "Single-Leg Glute Bridge",
  },
  Deadlift: {
    dumbbell: "Dumbbell Deadlift",
    band: "Band Deadlift",
    bodyweight: "Glute Bridge",
  },
  "Leg Curl": { band: "Band Leg Curl", bodyweight: "Glute Bridge March" },
  "Leg Extension": { band: "Band Leg Extension", bodyweight: "Wall Sit" },
  "Hip Thrust": { dumbbell: "Dumbbell Hip Thrust", bodyweight: "Glute Bridge" },
  "Standing Calf Raise": { bodyweight: "Calf Raise" },
  "Seated Calf Raise": { bodyweight: "Single-Leg Calf Raise" },
  "Barbell Bench Press": { dumbbell: "Dumbbell Bench Press", bodyweight: "Push-Up" },
  "Incline Dumbbell Press": { dumbbell: "Incline Dumbbell Press", bodyweight: "Decline Push-Up" },
  "Cable Fly": { band: "Band Chest Fly", bodyweight: "Wide Push-Up" },
  "Overhead Press": { dumbbell: "Dumbbell Shoulder Press", bodyweight: "Pike Push-Up" },
  "Arnold Press": { dumbbell: "Arnold Press", bodyweight: "Pike Push-Up" },
  "Push Press": { dumbbell: "Dumbbell Push Press", bodyweight: "Pike Push-Up" },
  "Lateral Raise": {
    dumbbell: "Lateral Raise",
    band: "Band Lateral Raise",
    bodyweight: "Plank Shoulder Tap",
  },
  "Barbell Row": { dumbbell: "Dumbbell Row", band: "Band Row", bodyweight: "Superman Row" },
  "Seated Row": { dumbbell: "Dumbbell Row", band: "Band Row", bodyweight: "Superman Row" },
  "Seated Cable Row": { dumbbell: "Dumbbell Row", band: "Band Row", bodyweight: "Superman Row" },
  "Lat Pulldown": { band: "Band Pulldown", bodyweight: "Superman Row" },
  "Pull-Up": { band: "Band Pulldown", bodyweight: "Superman Row" },
  "Chin-Up": { band: "Band Pulldown", bodyweight: "Superman Row" },
  "Pull-Up (assisted if needed)": { band: "Band Pulldown", bodyweight: "Superman Row" },
  "Pull-Up (weighted if possible)": { band: "Band Pulldown", bodyweight: "Superman Row" },
  "Face Pull": { band: "Band Face Pull", dumbbell: "Rear Delt Fly", bodyweight: "Prone Y-Raise" },
  "Barbell Curl": { dumbbell: "Dumbbell Curl", band: "Band Curl", bodyweight: "Towel Curl" },
  "Triceps Pushdown": { band: "Band Triceps Extension", bodyweight: "Triceps Dip" },
  "Hanging Knee Raise": { bodyweight: "Lying Leg Raise" },
};

/**
 * Adapt a workout schedule for home training: swap any item requiring
 * equipment the user doesn't have for a real alternative that works the same
 * muscles, preferring dumbbells/bands (if owned) over plain bodyweight.
 * Never recommends equipment the user doesn't have. No-op for gym users.
 */
export function adaptScheduleForHome<
  T extends { items: Array<{ name: string; [k: string]: unknown }> },
>(schedule: T[], location: "gym" | "home", equipment: Equipment[]): T[] {
  if (location !== "home") return schedule;
  const has = new Set(equipment);
  return schedule.map((day) => ({
    ...day,
    items: day.items.map((item) => {
      const sub = HOME_SUBSTITUTIONS[item.name];
      if (!sub) return item; // already home-friendly as-is
      const name =
        has.has("dumbbells") && sub.dumbbell
          ? sub.dumbbell
          : has.has("bands") && sub.band
            ? sub.band
            : sub.bodyweight;
      return { ...item, name };
    }),
  }));
}
