/**
 * Turning rows into a spreadsheet (client-safe).
 *
 * One careful implementation, because a comma in a product name or a quote in a
 * note must never split a row and quietly corrupt what the business downloads.
 */

/** Wraps a value so commas, quotes and newlines survive the trip into a spreadsheet. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (value instanceof Date) return `"${value.toISOString()}"`;
  if (typeof value === "boolean") return value ? '"yes"' : '"no"';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** A whole sheet: a header row, then one row per record, in the column order given. */
export function toCsv<T extends Record<string, unknown>>(
  columns: { key: keyof T & string; label: string }[],
  rows: T[],
) {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

/** Cents as a plain number a spreadsheet will add up: 1250 → 12.50. */
export function csvMoney(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toFixed(2);
}

/** "shag-noir-salon-2026-11-12" for a download name. */
export function exportStamp(businessName: string, date = new Date()) {
  const slug =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "bintro";
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `${slug}-${day}`;
}
