/** Shared types for the Settings → Import flow (spreadsheet / invoice / receipt upload). Client-safe. */

/**
 * inventory = counts on hand (sets qty). receipt = stock delivered (adds qty).
 * prices = price list: only updates cost / retail on products already in the app.
 */
export type ImportMode = 'inventory' | 'receipt' | 'prices'

/** Where a line's price came from, so staff can see what the AI guessed. */
export type PriceSource = 'document' | 'current' | 'ai' | 'manual' | 'none'

export type ImportLine = {
  key: number
  include: boolean
  /** Existing product this line updates, or null to create a new one. */
  productId: number | null
  barcode: string
  name: string
  brand: string
  size: string
  category: string
  vendor: string
  /** Count on hand (inventory) or units received (receipt). null = leave stock alone. Ignored for prices. */
  qty: number | null
  unitCostCents: number
  retailPriceCents: number
  costSource: PriceSource
  retailSource: PriceSource
}

export type ParsedImport =
  | { ok: true; mode: ImportMode; vendor: string; date: string; lines: ImportLine[] }
  | { ok: false; message: string }

export type ImportSummary = { created: number; updated: number; priced: number; units: number }

/** Largest upload accepted. Server functions cap request bodies at about 6 MB once base64-encoded. */
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024
export const MAX_IMPORT_LINES = 500
/** Lines sent per AI price-estimate call. */
export const PRICE_BATCH = 25

/** A line still needs an AI price when neither the document nor the matched product has one. */
export function needsPrice(line: ImportLine) {
  return !line.unitCostCents || !line.retailPriceCents
}
