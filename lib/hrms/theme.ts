/**
 * HRMS colour palette.
 *
 * The ATS brand is `brand-500 #ff2d87` on the `ink`/`graphite`/`shell` neutrals
 * from `tailwind.config.ts`. Charts and accent panels pull from here rather than
 * reaching for whatever Tailwind hue is nearest, which is how the indigo crept
 * in — a second, unrelated brand colour sitting next to the pink.
 *
 * Semantic colours (green / amber / red) stay as they are: they carry meaning,
 * not identity, and must not be brand-tinted.
 */

export const CHART = {
  /** Primary series — the brand pink. */
  primary: "#ff2d87",
  /** Secondary series — graphite, so it reads as "the other one" without competing. */
  secondary: "#4A4A4A",
  /** Tertiary series — a light brand tint. */
  tertiary: "#ff9bc6",
  /** Fourth series, and the neutral slice for unknown values. */
  muted: "#cbd5e1",
  /** Axis and gridline grey. */
  axis: "#94a3b8",
  grid: "#f1f5f9",
} as const;

/** Ordered palette for charts that need N series. */
export const CHART_SERIES = [
  CHART.primary,
  CHART.secondary,
  CHART.tertiary,
  CHART.muted,
] as const;

/**
 * Icon-chip tints for `StatCard`. Brand and neutral for identity; the semantic
 * three only where the number genuinely means good / warning / bad.
 */
export const TINT = {
  brand: "bg-brand-50 text-brand-600",
  neutral: "bg-gray-100 text-graphite",
  soft: "bg-brand-50/60 text-brand-500",
  good: "bg-green-50 text-green-600",
  warn: "bg-amber-50 text-amber-600",
  bad: "bg-red-50 text-red-600",
  info: "bg-gray-100 text-gray-600",
} as const;
