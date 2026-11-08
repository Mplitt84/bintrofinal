/** Booking apps with no way for Bintro to connect directly: their product sales come in as an uploaded report. */
export const SALES_REPORT_APPS = [
  'Fresha',
  'GlossGenius',
  'Mangomint',
  'Booksy',
  'Vagaro',
  'Boulevard',
  'Mindbody',
  'Zenoti',
  'Phorest',
  'Meevo',
  'Tattoo Studio Pro',
  'FlashBooker',
  'Other',
] as const

export type SalesReportLine = {
  key: number
  /** Matched product, or null when Bintro couldn't tell which product it is. */
  productId: number | null
  name: string
  brand: string
  size: string
  /** Units sold in the report period. */
  qty: number
}

export type ParsedSalesReport =
  | { ok: true; period: string; lines: SalesReportLine[] }
  | { ok: false; message: string }

export type SalesReportResult =
  | { ok: true; units: number; products: number }
  | { ok: false; duplicate: true; message: string }

/** The movement note every sale from one report carries, so the same report can't be logged twice. */
export function salesReportNote(app: string, period: string) {
  return `Sales report: ${app}${period.trim() ? ` · ${period.trim()}` : ''}`.slice(0, 200)
}
