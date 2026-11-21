/**
 * Count corrections (`adjust` movements): which ones are real losses, and which are just
 * the records being put right. Pure and tested; Reports, Profit and the corrections sheet
 * all use it, so "Lost to corrections" means one thing everywhere.
 *
 * A correction's note is "<source> · <reason>": "Count #12 · Damaged or spilled",
 * "Manual on-hand edit", "Import: SalonCentric · stock.csv", "Starting count from Square",
 * "Undo count #12". The reason (after the ·) decides.
 */

/** Reasons that mean product really left the shop without being sold or used on a client. */
export const LOSS_REASONS = ['Damaged or spilled', 'Expired', 'Missing', 'Not sure', 'Damaged', 'Missing SKU', 'Theft', 'No reason given'] as const

/** Reasons that mean the stock was right to change but it wasn't lost. */
export const NOT_LOSS_REASONS = [
  'Miscounted before',
  'Used on a client, not scanned',
  'Sold, not scanned',
  'Received, not scanned in',
  'Recount',
  'Data clean-up',
] as const

/** What a person can re-file a correction as, in the corrections sheet. */
export const EDITABLE_REASONS = [
  'Damaged or spilled',
  'Expired',
  'Missing',
  'Theft',
  'Not sure',
  'Used on a client, not scanned',
  'Sold, not scanned',
  'Miscounted before',
  'Data clean-up',
] as const

export type CorrectionKind = 'loss' | 'used' | 'sold' | 'fix'

const KIND_OF_REASON: Record<string, CorrectionKind> = {
  'used on a client, not scanned': 'used',
  'sold, not scanned': 'sold',
  'miscounted before': 'fix',
  'received, not scanned in': 'fix',
  recount: 'fix',
  'data clean-up': 'fix',
}

export const KIND_LABEL: Record<CorrectionKind, string> = {
  loss: 'Lost',
  used: 'Used, not scanned',
  sold: 'Sold, not scanned',
  fix: 'Record fix (not a loss)',
}

/** "Count #12 · Damaged" → { source: "Count #12", reason: "Damaged" }. */
export function splitNote(note: string) {
  // The reason is whatever follows the last ·, so a re-filed import keeps its file name in the source.
  const i = note.lastIndexOf('·')
  if (i < 0) return { source: note.trim(), reason: '' }
  return { source: note.slice(0, i).trim(), reason: note.slice(i + 1).trim() }
}

/** Corrections that only set the record straight, whatever their reason: starting counts, imports, undoing a count, editing the number. */
function sourceIsFix(source: string) {
  return /^(Undo count|Manual on-hand edit|Import:|Starting count from Square|Undo )/i.test(source)
}

/** Where a correction came from, in plain words. */
export function sourceLabel(note: string) {
  const { source } = splitNote(note)
  if (/^Count #\d+/i.test(source)) return 'Stock count'
  if (/^Undo count/i.test(source)) return 'Undoing a count'
  if (/^Manual on-hand edit/i.test(source)) return 'Number typed in on the product'
  if (/^Import:/i.test(source)) return 'Stock-count import'
  if (/^Starting count from Square/i.test(source)) return 'Starting count from Square'
  return source || 'Correction'
}

/**
 * Is this correction a loss? Only stock going down counts at all. A reason given on it always wins
 * (so re-filing works on any correction); without one, counts are losses ("No reason given") and
 * record fixes (imports, typed-in numbers, undoing a count, starting counts) are not.
 */
export function correctionKind(note: string, delta: number): CorrectionKind | null {
  if (delta >= 0) return null
  const { source, reason } = splitNote(note)
  const r = reason.toLowerCase()
  if (KIND_OF_REASON[r]) return KIND_OF_REASON[r]
  if (KNOWN_LOSS.has(r)) return 'loss'
  // Imports write "Import: <vendor> · <file>": the part after · is a file name, not a reason.
  return sourceIsFix(source) ? 'fix' : 'loss'
}

const KNOWN_LOSS = new Set<string>(LOSS_REASONS.map((r) => r.toLowerCase()))

/** The reason shown for a correction ("No reason given" for a count with none). */
export function reasonFor(note: string) {
  const { source, reason } = splitNote(note)
  const known = KNOWN_LOSS.has(reason.toLowerCase()) || Boolean(KIND_OF_REASON[reason.toLowerCase()])
  if (sourceIsFix(source)) return known ? reason : ''
  return reason || 'No reason given'
}

/** The note with a new reason, keeping where it came from: "Count #12 · Missing" → "Count #12 · Expired". */
export function withReason(note: string, reason: string) {
  const { source, reason: old } = splitNote(note)
  // Keep an import's file name: "Import: X · file.csv" → "Import: X · file.csv · Missing".
  const known = KNOWN_LOSS.has(old.toLowerCase()) || Boolean(KIND_OF_REASON[old.toLowerCase()])
  const base = old && !known ? `${source} · ${old}` : source || 'Correction'
  return `${base} · ${reason}`.slice(0, 200)
}
