import { test } from "node:test";
import assert from "node:assert/strict";
import { waterTargetMl } from "./water.ts";

test("waterTargetMl — scales with bodyweight, rounded to nearest 250ml", () => {
  // 70kg * 35ml/kg = 2450 -> rounds to 2500
  assert.equal(waterTargetMl(70), 2500);
});

test("waterTargetMl — floors at 1500ml for very low bodyweight", () => {
  assert.equal(waterTargetMl(20), 1500);
});

test("waterTargetMl — caps at 4000ml for very high bodyweight", () => {
  assert.equal(waterTargetMl(200), 4000);
});

test("waterTargetMl — defaults to 2000ml when weight is unknown", () => {
  assert.equal(waterTargetMl(null), 2000);
});
