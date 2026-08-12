/**
 * HRMS display conventions — `docs/hrms/10-foundation-spec.md §8`.
 *
 * Every one of these exists because the reference product got it wrong in a way
 * we catalogued. There must be exactly ONE rendering of each concept, so nothing
 * here should be inlined at a call site.
 */

/** The single null rendering. Never `-`, `-----`, `N/A`, or a blank cell. */
export const EMPTY = "—";

/** `DD-MM-YYYY`. Used everywhere, tooltips included. */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY; // never render "Invalid date"
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** `DD-MM-YYYY HH:mm`, 24-hour. */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(d)} ${hh}:${mi}`;
}

/** `HH:mm` from an ISO timestamp, or `—` when there is no punch. */
export function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Minutes → `8h 30m`. Zero is a real duration, so it renders as `0h 00m`. */
export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null) return EMPTY;
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

/** `1 day` / `3 days` / `0.5 day`. Never `1 Days`. */
export function fmtDays(count: number | null | undefined): string {
  if (count == null) return EMPTY;
  return `${count} ${count === 1 ? "day" : "days"}`;
}

/**
 * Paise → `₹1,23,456`. Money is stored as an integer everywhere; this is the
 * only place it becomes a decimal.
 */
export function fmtMoney(paise: number | null | undefined, opts?: { decimals?: boolean }): string {
  if (paise == null) return EMPTY;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(paise / 100);
}

/** `₹12.5 L` — for requisition budgets, which Indian users read in lacs. */
export function fmtLacs(paise: number | null | undefined): string {
  if (paise == null) return EMPTY;
  const lacs = paise / 100 / 100000;
  return `₹${lacs % 1 === 0 ? lacs : lacs.toFixed(2)} L`;
}

/**
 * Aggregates render `—` when there is nothing to average, never `0`.
 * (The reference showed "Average Age: 0" for an empty directory.)
 */
export function fmtAggregate(
  value: number | null | undefined,
  suffix = ""
): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return `${value}${suffix}`;
}

/** `NULL` means no limit — never a `9999` sentinel. */
export function fmtLimit(value: number | null | undefined, unit = ""): string {
  if (value == null) return "No limit";
  return unit ? `${value} ${unit}` : String(value);
}

export function fmtPercent(value: number | null | undefined): string {
  if (value == null) return EMPTY;
  return `${value}%`;
}

/** Any text field: blank strings collapse to the one null rendering. */
export function fmtText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Today as `YYYY-MM-DD`, for date inputs. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
