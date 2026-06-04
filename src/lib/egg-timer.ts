// Pure calculation helpers for egg cooking times.

export type Size = "S" | "M" | "L" | "XL";

const BASE_SOFT = 4 * 60;     // 4:00
const BASE_MEDIUM = 6 * 60 + 30; // 6:30
const BASE_HARD = 9 * 60 + 30;  // 9:30

const SIZE_OFFSET: Record<Size, number> = {
  S: -45,
  M: 0,
  L: 45,
  XL: 90,
};

/** doneness: 0 (soft) → 0.5 (medium) → 1 (hard) */
export function baseTimeFromDoneness(doneness: number): number {
  const d = Math.max(0, Math.min(1, doneness));
  if (d <= 0.5) {
    const t = d / 0.5;
    return BASE_SOFT + (BASE_MEDIUM - BASE_SOFT) * t;
  }
  const t = (d - 0.5) / 0.5;
  return BASE_MEDIUM + (BASE_HARD - BASE_MEDIUM) * t;
}

/** pressureHpa default 1013 sea level. +~10s per 35 hPa below. */
export function pressureAdjustment(pressureHpa: number): number {
  const delta = 1013 - pressureHpa;
  if (delta <= 0) return 0;
  return Math.round((delta / 35) * 10);
}

export function calcCookSeconds(
  doneness: number,
  size: Size,
  pressureHpa: number,
): number {
  const total =
    baseTimeFromDoneness(doneness) + SIZE_OFFSET[size] + pressureAdjustment(pressureHpa);
  return Math.max(60, Math.round(total));
}

export function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function donenessLabel(doneness: number): string {
  if (doneness < 0.34) return "Soft";
  if (doneness < 0.67) return "Medium";
  return "Hard";
}

export function donenessVariant(doneness: number): "soft" | "medium" | "hard" {
  if (doneness < 0.34) return "soft";
  if (doneness < 0.67) return "medium";
  return "hard";
}
