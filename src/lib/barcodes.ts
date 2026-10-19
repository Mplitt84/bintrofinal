/**
 * Barcode sanity checks. Scanners sometimes send only part of a code (a fast swipe,
 * a crumpled label, a scanner that times out mid-read). Retail barcodes carry a
 * GS1 check digit, so a short or mis-read number can be caught before it turns
 * into a bogus "new product".
 */

/** GS1 mod-10 check for EAN-8, UPC-A (12), EAN-13 and GTIN-14. */
function validGs1(code: string) {
  let sum = 0
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(code[i]) * w
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1])
}

/** 8-digit UPC-E (common on small US cosmetics): expand to UPC-A and check that. */
function validUpcE(code: string) {
  if (code[0] !== '0' && code[0] !== '1') return false
  const d = code.slice(1, 7)
  const last = d[5]
  let body: string
  if (last <= '2') body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`
  else if (last === '3') body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`
  else if (last === '4') body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`
  else body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`
  return validGs1(`${code[0]}${body}${code[7]}`)
}

export type ScanCheck = { ok: true } | { ok: false; reason: 'short' | 'fragment' | 'checksum' }

/**
 * For a code that matched no product: does it look like an incomplete or mis-read
 * retail barcode? Only all-digit codes are checked, so SKUs like BT-4F21C9 pass.
 */
export function checkUnknownScan(code: string, knownBarcodes: string[]): ScanCheck {
  if (!/^\d+$/.test(code)) return { ok: true }
  // Part of a barcode we already stock: definitely a partial read.
  if (knownBarcodes.some((b) => b.length > code.length && b.includes(code))) return { ok: false, reason: 'fragment' }
  if (code.length < 8) return { ok: false, reason: 'short' }
  if (code.length > 14) return { ok: true }
  if (code.length === 8 && (validGs1(code) || validUpcE(code))) return { ok: true }
  if ((code.length === 12 || code.length === 13 || code.length === 14) && validGs1(code)) return { ok: true }
  return { ok: false, reason: code.length < 12 && code.length !== 8 ? 'short' : 'checksum' }
}
