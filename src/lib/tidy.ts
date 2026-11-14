/** Client-safe types for the data clean-up tools: smart par, categories, duplicates. */

export type ParSuggestion = {
  productId: number;
  name: string;
  brand: string;
  size: string;
  /** Reorder at (par) now and suggested. */
  current: number;
  suggested: number;
  /** Order up to now and suggested (0 = order back to par). */
  currentMax: number;
  suggestedMax: number;
  /** Units per case, used to round "Order up to". */
  packSize: number;
  /** Average units used or sold per day. */
  perDay: number;
  /** Plain words (third-grade level), e.g. "You use about 1 a day · orders from SalonCentric take about 5 days · you use about the same each week". */
  reason: string;
};

/** Stock sitting well above "Order up to": cash tied up on the shelf. */
export type Overstock = {
  productId: number;
  name: string;
  onHand: number;
  /** Days the shelf would last at the current pace. */
  daysOfStock: number;
  /** Cost of the units above "Order up to". */
  extraCents: number;
};

/** The latest Smart par apply that can still be undone. */
export type ParChangeSummary = { batchId: string; at: string; products: number; staffName: string };

export type SmartParResult = {
  suggestions: ParSuggestion[];
  overstock: Overstock[];
  orderEveryDays: number;
  /** Latest apply that can be undone. */
  lastChange: ParChangeSummary | null;
};

export type CategoryGroup = {
  /** Spellings of one category, most-used first. */
  names: { name: string; products: number }[];
  total: number;
};

export type DuplicateGroup = {
  /** Likely the same product; the first is the suggested one to keep. */
  products: {
    id: number;
    name: string;
    brand: string;
    size: string;
    category: string;
    vendor: string;
    qty: number;
    barcode: string;
    linkedToSquare: boolean;
  }[];
};

/**
 * One supplier, as the Suppliers tidy screen shows it. Suppliers are plain text on
 * each product, so the same shop arrives three ways — "Hairstory",
 * "www.hairstory.com", "https://www.hairstory.com" — and every report counts them
 * separately until somebody says they are the same. `vendorKey` is what decides
 * "probably the same supplier"; the screen only ever suggests, and a person picks.
 */
export type VendorGroup = {
  /** Spellings of one supplier, most products first. */
  names: { name: string; products: number }[]
  total: number
}

/**
 * The comparable form of a supplier's name: lower-cased, with a web address stripped
 * back to its domain and any leading "www." dropped, so "https://www.CultAndKing.com/"
 * and "cultandking.com" land on the same key. A name that is not a web address keeps
 * its words, sorted, so "SalonCentric" and "Salon Centric" match too.
 */
export function vendorKey(name: string) {
  const clean = name.trim().toLowerCase()
  if (!clean) return ''
  const web = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/.exec(clean)
  if (web) return web[1].replace(/\.(com|net|org|co|shop|us)$/, '')
  return clean
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

/** True when a supplier was saved as a web address rather than a name. */
export function looksLikeUrl(name: string) {
  return /^(?:https?:\/\/)|(?:^|\.)[a-z0-9-]+\.[a-z]{2,}(?:\/|$)/i.test(name.trim())
}

/**
 * Spellings that look like one supplier, biggest group first. Groups of one are left
 * out. Within a group the plain name comes first even on a tie, so the one-tap
 * default is "Reverie" rather than "https://www.reverie.com" — cleaning those up is
 * the whole point of the screen.
 */
export function groupVendors(rows: { vendor: string; products: number }[]): VendorGroup[] {
  const map = new Map<string, VendorGroup>()
  for (const row of rows) {
    const key = vendorKey(row.vendor)
    if (!key) continue
    const group = map.get(key) ?? { names: [], total: 0 }
    group.names.push({ name: row.vendor, products: row.products })
    group.total += row.products
    map.set(key, group)
  }
  return [...map.values()]
    .filter((g) => g.names.length > 1)
    .map((g) => ({
      ...g,
      names: g.names.sort(
        (a, b) =>
          b.products - a.products ||
          Number(looksLikeUrl(a.name)) - Number(looksLikeUrl(b.name)) ||
          a.name.length - b.name.length ||
          a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => b.total - a.total)
}
