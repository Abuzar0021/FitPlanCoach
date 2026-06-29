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

function pickFoods(
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
      const grams = Math.max(20, Math.round((perItemCals / f.calories_per_100g) * 100));
      const cals = Math.round((grams * f.calories_per_100g) / 100);
      const p = Math.round((grams * f.protein_per_100g) / 100);
      meals[cat].push({ food_id: f.id, name: f.name, grams, calories: cals, protein: p });
      totalCals += cals;
      totalProtein += p;
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
): WorkoutTemplate | null {
  const level =
    activity === "sedentary" || activity === "light"
      ? "beginner"
      : activity === "moderate"
        ? "intermediate"
        : "advanced";
  // Treat lose_fat templates as flexible for maintain
  const goalMatch = templates.filter(
    (t) => t.goal === goal || (goal === "maintain" && t.goal === "lose_fat"),
  );
  const exact = goalMatch.find((t) => t.level === level);
  if (exact) return exact;
  return goalMatch[0] ?? templates[0] ?? null;
}
