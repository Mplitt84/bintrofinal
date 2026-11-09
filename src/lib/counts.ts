/** Client-safe types and rules for Count & reconcile. */

export const COUNT_REASONS = [
  'Miscounted before',
  'Used on a client, not scanned',
  'Sold, not scanned',
  'Received, not scanned in',
  'Damaged or spilled',
  'Expired',
  'Missing',
  'Not sure',
] as const;

/** The shorter list for a quick check from the Scan tab. */
export const CHECK_REASONS = ['Recount', 'Damaged', 'Missing SKU', 'Theft'] as const;

export type CountReason = (typeof COUNT_REASONS)[number];

/** A difference big enough to ask for a recount before approving. */
export function needsRecount(expected: number, counted: number, unitCostCents: number) {
  const diff = Math.abs(counted - Math.max(0, expected));
  if (diff === 0) return false;
  return diff >= 3 || diff * unitCostCents >= 2500 || (expected > 0 && diff / expected >= 0.25 && diff >= 2);
}

export type CountSummary = {
  id: number;
  scope: string;
  blind: boolean;
  staffName: string;
  itemsCounted: number;
  itemsChanged: number;
  unitsOver: number;
  unitsShort: number;
  valueDiffCents: number;
  createdAt: string;
  /** Set when the count was reversed. */
  undoneAt: string | null;
  undoneBy: string;
};

export type CountLineDetail = {
  productId: number;
  name: string;
  expected: number;
  counted: number;
  diff: number;
  unitCostCents: number;
  reason: string;
};

/** "Counted Nov 8 by Minnie" / "Never counted". */
export function lastCountedLabel(p: { lastCountedAt: string | Date | null; lastCountedBy: string }) {
  if (!p.lastCountedAt) return 'Never counted';
  const when = new Date(p.lastCountedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `Last counted ${when}${p.lastCountedBy ? ` by ${p.lastCountedBy}` : ''}`;
}

/** The count a movement belongs to, from its note ("Count #12 · Damaged" / "Undo count #12"). */
export function countIdFromNote(note: string) {
  const m = /count #(\d+)/i.exec(note);
  return m ? Number(m[1]) : null;
}
