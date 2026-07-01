/** ~35ml per kg of bodyweight is a common hydration rule of thumb, rounded
 * to the nearest 250ml serving and clamped to a sane range. */
export function waterTargetMl(weightKg: number | null): number {
  const base = weightKg ? weightKg * 35 : 2000;
  return Math.min(4000, Math.max(1500, Math.round(base / 250) * 250));
}
