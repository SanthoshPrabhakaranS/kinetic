export type WeightUnit = "kg" | "lbs";

const KG_TO_LBS = 2.2046226218;

export function kgToLbs(kg: number): number {
  return kg * KG_TO_LBS;
}

export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS;
}

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  return from === "kg" ? kgToLbs(value) : lbsToKg(value);
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}

function trimZero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return trimZero(roundTo1(value));
}

export function formatWeightDelta(value: number, unit: WeightUnit): string {
  return (value >= 0 ? "+" : "") + formatWeight(value, unit);
}

export function formatWeightUnit(unit: WeightUnit): string {
  return unit === "kg" ? "kg" : "lbs";
}
