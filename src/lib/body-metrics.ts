// Pure body-composition math — no external dependencies, same style as
// fitness-engine.ts. Kept separate because BMI/measurement helpers aren't
// part of plan generation.

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** Standard BMI: weight (kg) / height (m)^2. */
export function bmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** WHO adult BMI reference ranges — informational only, not medical advice. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obese";
}
