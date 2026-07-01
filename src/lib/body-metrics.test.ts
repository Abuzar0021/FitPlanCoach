import { test } from "node:test";
import assert from "node:assert/strict";
import { bmi, bmiCategory } from "./body-metrics.ts";

test("bmi — computes weight(kg) / height(m)^2", () => {
  // 70kg at 175cm -> 70 / 1.75^2 = 22.857...
  assert.ok(Math.abs(bmi(70, 175) - 22.857) < 0.01);
});

test("bmi — taller at same weight gives a lower value", () => {
  assert.ok(bmi(80, 190) < bmi(80, 160));
});

test("bmiCategory — boundaries match WHO adult reference ranges", () => {
  assert.equal(bmiCategory(18.4), "underweight");
  assert.equal(bmiCategory(18.5), "normal");
  assert.equal(bmiCategory(24.9), "normal");
  assert.equal(bmiCategory(25), "overweight");
  assert.equal(bmiCategory(29.9), "overweight");
  assert.equal(bmiCategory(30), "obese");
  assert.equal(bmiCategory(40), "obese");
});
