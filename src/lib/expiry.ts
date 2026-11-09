/** Product expiry: "" = not set, "none" = doesn't expire, or a YYYY-MM-DD date. Client-safe. */

export const EXPIRY_WARN_DAYS = 60;

export const SHELF_LIFE_OPTIONS = [18, 24, 36] as const;

/** Today plus N months, as YYYY-MM-DD in local time. */
export function monthsFromToday(months: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isExpiryDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Whole days until the expiry date (negative once expired), or null when there's no date. */
export function daysToExpiry(value: string, now = new Date()) {
  if (!isExpiryDate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const end = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 86_400_000);
}

export type ExpiryState = "unset" | "none" | "ok" | "soon" | "expired";

export function expiryState(value: string, now = new Date()): ExpiryState {
  if (value === "none") return "none";
  const days = daysToExpiry(value, now);
  if (days === null) return "unset";
  if (days < 0) return "expired";
  return days <= EXPIRY_WARN_DAYS ? "soon" : "ok";
}

/** "Mar 2028" style label for a YYYY-MM-DD date. */
export function expiryLabel(value: string) {
  if (value === "none") return "No expiration";
  if (!isExpiryDate(value)) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
