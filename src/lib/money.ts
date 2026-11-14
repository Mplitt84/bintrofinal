/**
 * How money is written on screen (client-safe, pure, tested).
 *
 * Amounts are stored as whole cents everywhere in Bintro. This is the one place that
 * turns them into something a person reads, so a business in Canada or the UK sees its
 * own symbol instead of a bare number — and so no screen has to hard-code a `$` again.
 *
 * `centsToDollars` in `components/ui/bits.tsx` stays as it is: it writes the bare
 * number that goes *into* a price field, where a currency symbol would be in the way.
 */

export type Currency = {
  code: string
  label: string
  /** What people call the unit, for the odd line that needs the word. */
  unit: string
}

/** The currencies Bintro offers. Any other ISO code still formats correctly if saved. */
export const CURRENCIES: Currency[] = [
  { code: 'USD', label: 'US dollar ($)', unit: 'dollar' },
  { code: 'CAD', label: 'Canadian dollar (C$)', unit: 'dollar' },
  { code: 'GBP', label: 'British pound (£)', unit: 'pound' },
  { code: 'EUR', label: 'Euro (€)', unit: 'euro' },
  { code: 'AUD', label: 'Australian dollar (A$)', unit: 'dollar' },
  { code: 'MXN', label: 'Mexican peso (MX$)', unit: 'peso' },
]

export const DEFAULT_CURRENCY = 'USD'

export function currencyLabel(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.label ?? code
}

/** Intl formatters are costly to build, so each one is made once and kept. */
const cache = new Map<string, Intl.NumberFormat>()

function formatter(code: string, whole: boolean) {
  const key = `${code}:${whole}`
  const found = cache.get(key)
  if (found) return found
  let made: Intl.NumberFormat
  try {
    made = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code || DEFAULT_CURRENCY,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  } catch {
    // An unknown code would otherwise throw and take the screen down with it.
    made = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  }
  cache.set(key, made)
  return made
}

/**
 * Cents as money: `money(5600)` → `$56.00`. A negative amount keeps a true minus sign
 * rather than brackets, because a shop floor reads `−$12.00` faster than `($12.00)`.
 */
export function money(cents: number, code = DEFAULT_CURRENCY) {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0
  const text = formatter(code, false).format(Math.abs(safe) / 100)
  return safe < 0 ? `−${text}` : text
}

/** Whole amounts for stat tiles, where the pennies are noise: `$1,907`. */
export function moneyShort(cents: number, code = DEFAULT_CURRENCY) {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0
  const text = formatter(code, true).format(Math.abs(safe) / 100)
  return safe < 0 ? `−${text}` : text
}

/** Just the symbol, for a field's prefix: `$`. */
export function currencySymbol(code = DEFAULT_CURRENCY) {
  const parts = formatter(code, true).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? '$'
}
