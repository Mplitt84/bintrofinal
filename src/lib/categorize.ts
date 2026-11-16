/**
 * Auto-categorize: guesses a product's category from its name, brand and size, and
 * offers tidier formatting for the name and size. Client-safe and pure, so it runs
 * on the server for the Suppliers / Categories tidy screens and is easy to test.
 *
 * Two signals, in order of trust:
 * 1. The business's own filing. Products that already have a category teach the rest:
 *    a new product sharing words, brand and bottle size with ten "Backbar" products is
 *    probably backbar too. This is what makes it work for any industry and any naming.
 * 2. Keyword rules (shampoo, developer, foil, polish…) with the size deciding retail vs
 *    backbar when the business splits them. Used when nothing similar is filed yet, and
 *    mapped onto the business's existing category names whenever one fits.
 *
 * It only ever suggests. A person ticks, corrects and applies.
 */

export type CategorizeInput = { id: number; name: string; brand: string; size: string; category: string }

export type CategorySuggestion = {
  productId: number
  name: string
  brand: string
  size: string
  /** What it's filed under now ("" = nothing). */
  current: string
  /** Best guess, "" when there's no sensible guess. */
  suggested: string
  /** Up to 3 other likely categories to offer as one-tap corrections. */
  alternatives: string[]
  confidence: 'high' | 'medium' | 'low'
  /** Plain words: "Like 6 other Olaplex products you filed under Treatments". */
  reason: string
  /** Tidier name / size, or null when they're already fine. */
  formattedName: string | null
  formattedSize: string | null
}

/* ------------------------------------------------------------------ Sizes */

const UNIT_ALIASES: Record<string, string> = {
  oz: 'oz', ounce: 'oz', ounces: 'oz', 'fl oz': 'fl oz', floz: 'fl oz', 'fl. oz': 'fl oz', 'fl.oz': 'fl oz',
  ml: 'ml', mls: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'L', lt: 'L', ltr: 'L', liter: 'L', liters: 'L', litre: 'L', litres: 'L',
  g: 'g', gr: 'g', gram: 'g', grams: 'g', grm: 'g',
  kg: 'kg', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ct: 'ct', count: 'ct', pc: 'ct', pcs: 'ct', pk: 'pk', pack: 'pk', gal: 'gal', gallon: 'gal', gallons: 'gal',
}

const SIZE_RE =
  /(\d+(?:[.,]\d+)?)\s*(fl\.?\s*oz|floz|ounces?|oz|millilit(?:er|re)s?|mls?|lit(?:er|re)s?|ltr|lt|l|grams?|grm|gr|g|kg|lbs?|pounds?|gallons?|gal|count|ct|pcs?|pc|pk|pack)\b/i

export type ParsedSize = { amount: number; unit: string; /** Volume in ml or weight in g, for comparing. */ base: number; kind: 'volume' | 'weight' | 'count' }

/** Reads "33.8 OZ", "1 Liter", "250ml", "2.06oz tube" — from the size, or from the name when size is blank. */
export function parseSize(size: string, name = ''): ParsedSize | null {
  const m = SIZE_RE.exec(size) ?? (size.trim() ? null : SIZE_RE.exec(name))
  if (!m) return null
  const amount = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  const raw = m[2].toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '')
  const unit = UNIT_ALIASES[raw] ?? UNIT_ALIASES[raw.replace(/[.\s]/g, '')] ?? raw
  const factor: Record<string, [number, ParsedSize['kind']]> = {
    oz: [29.57, 'volume'], 'fl oz': [29.57, 'volume'], ml: [1, 'volume'], L: [1000, 'volume'], gal: [3785, 'volume'],
    g: [1, 'weight'], kg: [1000, 'weight'], lb: [453.6, 'weight'], ct: [1, 'count'], pk: [1, 'count'],
  }
  const [mult, kind] = factor[unit] ?? [1, 'count']
  return { amount, unit, base: amount * mult, kind }
}

const trimNumber = (n: number) => String(Math.round(n * 100) / 100)

/** "33.8OZ" → "33.8 oz", "1 LITER" → "1 L", "250 ML" → "250 ml". Null when it's already tidy or unreadable. */
export function formatSize(size: string): string | null {
  const trimmed = size.trim()
  if (!trimmed) return null
  const m = SIZE_RE.exec(trimmed)
  if (!m) return null
  const parsed = parseSize(trimmed)
  if (!parsed) return null
  const rest = (trimmed.slice(0, m.index) + ' ' + trimmed.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
  const tidy = `${trimNumber(parsed.amount)} ${parsed.unit}${rest ? ` ${rest.toLowerCase()}` : ''}`
  return tidy === trimmed ? null : tidy
}

/** Size bucket used as a learning feature: sample / retail / large / liter-and-up. */
function sizeBucket(p: ParsedSize | null) {
  if (!p || p.kind === 'count') return ''
  if (p.base <= 60) return 'xs'
  if (p.base <= 400) return 'retail'
  if (p.base <= 700) return 'large'
  return 'liter'
}

/* ------------------------------------------------------------------ Names */

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'w/'])
const KEEP_UPPER = new Set(['uv', 'spf', 'ph', 'diy', 'xl', 'xxl', 'led', 'cbd', 'ii', 'iii', 'iv', 'hd', 'nyc', 'usa', 'eq', 'ph+'])

/**
 * Tidies a product name: collapses spaces and fixes SHOUTING or all-lowercase names to
 * Title Case. A name already in mixed case is left alone, because "Olaplex No.3" and
 * "K18" are spelled that way on purpose. Shade codes like "7N" or "9V" stay as typed.
 */
export function formatName(name: string): string | null {
  const collapsed = name.replace(/\s+/g, ' ').replace(/\s+([,.)])/g, '$1').trim()
  const letters = collapsed.replace(/[^a-z]/gi, '')
  const shouting = letters.length >= 4 && letters === letters.toUpperCase()
  const whisper = letters.length >= 4 && letters === letters.toLowerCase()
  let out = collapsed
  if (shouting || whisper) {
    out = collapsed
      .toLowerCase()
      .split(' ')
      .map((word, i) => {
        if (KEEP_UPPER.has(word)) return word.toUpperCase()
        if (/^\d+[a-z]{1,3}$/.test(word) && !SIZE_RE.test(word)) return word.toUpperCase() // shade 7n → 7N
        if (/^\d/.test(word)) return word // 33.8oz, 1:1.5
        if (i > 0 && SMALL_WORDS.has(word)) return word
        return word.replace(/(^|[-/(&+])([a-z])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase())
      })
      .join(' ')
  }
  return out === name ? null : out
}

/* ------------------------------------------------------------------ Keyword rules */

type Rule = {
  label: string
  words: RegExp
  /** Words that find this rule's home among existing category names, most telling first. */
  homes: string[]
}

/** Ordered: the first rule that matches wins, so specific ones (developer) come before broad ones (color). */
export const RULES: Rule[] = [
  { label: 'Developer', words: /\b(developer|peroxide|oxidi[sz]er|oxidant|\d{1,2}\s?vol(ume)?)\b/i, homes: ['developer', 'color', 'chemical'] },
  { label: 'Lightener', words: /\b(lighten(er|ing)|bleach(ing)? powder|blond(e|ing) powder|blondor|decolor|lift(ing)? powder)\b/i, homes: ['lightener', 'bleach', 'color', 'chemical'] },
  { label: 'Toner & gloss', words: /\b(toners?|gloss|glaze|shades eq|demi[- ]?permanent|color touch)\b/i, homes: ['toner', 'gloss', 'color'] },
  { label: 'Hair color', words: /\b(hair ?colou?r|permanent colou?r|tint|dye|haircolor|color cream|colou?r tube|semi[- ]?permanent|direct dye)\b/i, homes: ['hair color', 'color', 'colour'] },
  { label: 'Color supplies', words: /\b(foils?|color bowl|tint bowl|tint brush|applicator bottle|colou?r brush|stain (guard|remover)|meche|balayage board|processing cap)\b/i, homes: ['foil', 'wrap', 'bowl', 'supplies', 'disposable'] },
  { label: 'Shampoo', words: /\b(shampoo|co-?wash|cleansing conditioner|cleanser|clarif(y|ying))\b/i, homes: ['shampoo', 'wash', 'hair care', 'care'] },
  { label: 'Conditioner', words: /\b(conditioner|leave[- ]?in|detangl(er|ing)|rinse[- ]?out)\b/i, homes: ['conditioner', 'hair care', 'care'] },
  { label: 'Treatments', words: /\b(masque|mask|treatment|bond (builder|repair|maintenance)|olaplex|k18|protein|reconstruct\w*|deep condition\w*|scalp (serum|treatment|scrub)|hair oil|serum|elixir)\b/i, homes: ['treatment', 'bond', 'mask', 'hair care', 'care'] },
  { label: 'Styling', words: /\b(gel|mousse|curl (cream|custard|defin\w*|enhanc\w*)|custard|pomade|wax|edge (control|tamer)|hair ?spray|texturi[sz]ing|sea salt|foam|paste|pudding|smoothing|heat protect\w*|thermal|blow ?dry|styling|hold|spray)\b/i, homes: ['styling', 'style', 'finish'] },
  { label: 'Tools', words: /\b(brush|comb|clips?|shears?|scissors|razor|dryer|diffuser|flat ?iron|curling (iron|wand)|bonnet|spray bottle|clipper|trimmer|sectioning|pins?|hair ?ties?|scrunchie|rollers?|rods?)\b/i, homes: ['tool', 'brush', 'shear', 'clip', 'equipment', 'accessor'] },
  { label: 'Salon supplies', words: /\b(gloves?|capes?|neck ?strips?|cotton|towels?|wrap|tissue|plastic caps?|shower caps?|disposable|aprons?|bags?|paper towels?)\b/i, homes: ['glove', 'strip', 'towel', 'cape', 'supplies', 'disposable'] },
  { label: 'Cleaning', words: /\b(disinfect\w*|barbicide|sanitiz\w*|clorox|lysol|cleaner|cleaning|wipes|dish soap|hand soap|laundry|detergent|trash bags?|bleach)\b/i, homes: ['disinfect', 'clean', 'sanit', 'janitor'] },
  { label: 'Nails', words: /\b(nail|polish|lacquer|gel polish|top coat|base coat|acetone|cuticle|acrylic|dip powder|buffer)\b/i, homes: ['nail', 'polish', 'mani'] },
  { label: 'Skin care', words: /\b(face|facial|moisturi[sz]er|lotion|body (wash|butter|oil)|sunscreen|spf|toner pads?|exfoliat\w*|lip (balm|scrub)|eye cream)\b/i, homes: ['skin', 'body', 'spa'] },
  { label: 'Front desk', words: /\b(receipt paper|printer|ink|pens?|notebook|gift cards?|business cards?|labels?|tape|stapl\w*)\b/i, homes: ['front desk', 'office', 'desk'] },
  { label: 'Refreshments', words: /\b(coffee|tea|water|sparkling|snacks?|cups?|creamer|sugar|wine|champagne|kombucha|juice)\b/i, homes: ['coffee', 'refresh', 'beverage', 'drink', 'amenit', 'kitchen'] },
]

const fold = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const STOP = new Set(['the', 'and', 'for', 'with', 'new', 'size', 'pro', 'professional', 'salon', 'hair', 'oz', 'ml', 'fl'])
function tokens(text: string) {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

/**
 * Picks the category a rule belongs in among `names` (the business's own, then its
 * trade's starter list), using the bottle size to split retail and backbar when the
 * names do. The earlier a home word appears in the rule's list, the stronger the match.
 */
function mapRule(rule: Rule, names: { name: string; products: number }[], bucket: string) {
  const big = bucket === 'large' || bucket === 'liter'
  const score = (name: string) => {
    const f = fold(name)
    const i = rule.homes.findIndex((h) => f.includes(h))
    if (i < 0) return -Infinity
    let s = 10 - i * 2
    if (f.includes(fold(rule.label))) s += 2
    if (bucket) {
      if (/back ?bar|professional|liter|litre|bulk|salon use/.test(f)) s += big ? 3 : -3
      if (/retail|take ?home|resale/.test(f)) s += big ? -3 : 3
    }
    return s
  }
  const best = names
    .map((n) => ({ n, s: score(n.name) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.n.products - a.n.products)[0]
  return best?.n.name ?? null
}

/* ------------------------------------------------------------------ Predict */

type Learned = { category: string; toks: Set<string>; brand: string; bucket: string }

/**
 * Suggestions for every product without a category (or, with `recheck`, also for
 * products whose filing looks wrong). Sorted most-confident first.
 */
export function suggestCategories(
  all: CategorizeInput[],
  opts: { recheck?: boolean; /** The trade's starter category names, used before inventing one. */ starter?: string[] } = {},
): CategorySuggestion[] {
  const learned: Learned[] = all
    .filter((p) => p.category.trim())
    .map((p) => ({
      category: p.category.trim(),
      toks: new Set([...tokens(p.name)]),
      brand: fold(p.brand),
      bucket: sizeBucket(parseSize(p.size, p.name)),
    }))

  // How rare each word is: "olaplex" says more than "shampoo" when half the shelf is shampoo.
  const df = new Map<string, number>()
  for (const l of learned) for (const t of l.toks) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t: string) => Math.log(1 + learned.length / (df.get(t) ?? 1))

  const counts = new Map<string, number>()
  for (const l of learned) counts.set(l.category, (counts.get(l.category) ?? 0) + 1)
  const existing = [...counts].map(([name, products]) => ({ name, products }))

  const out: CategorySuggestion[] = []
  for (const p of all) {
    const current = p.category.trim()
    if (current && !opts.recheck) continue
    const size = parseSize(p.size, p.name)
    const bucket = sizeBucket(size)
    const mine = new Set(tokens(p.name))
    const brand = fold(p.brand)

    // 1. Learn from the business's own filing (nearest neighbours, weighted).
    const votes = new Map<string, { score: number; n: number; brandHits: number }>()
    for (const l of learned) {
      if (current && l.category === current && l.toks.size === mine.size && [...mine].every((t) => l.toks.has(t)) && l.brand === brand) continue // itself
      let s = 0
      for (const t of mine) if (l.toks.has(t)) s += idf(t)
      if (s === 0) continue
      const brandMatch = brand && l.brand === brand
      if (brandMatch) s += 1.2
      if (bucket && l.bucket === bucket) s += 0.8
      else if (bucket && l.bucket && l.bucket !== bucket) s -= 0.6
      if (s <= 0.5) continue
      const v = votes.get(l.category) ?? { score: 0, n: 0, brandHits: 0 }
      v.score += s
      v.n += 1
      if (brandMatch) v.brandHits += 1
      votes.set(l.category, v)
    }
    const ranked = [...votes].sort((a, b) => b[1].score - a[1].score)
    const total = ranked.reduce((s, [, v]) => s + v.score, 0)

    // 2. Keyword rules, mapped onto their existing names when one fits.
    const text = `${p.name} ${p.size}`
    const rule = RULES.find((r) => r.words.test(text))
    const ruleCategory = rule
      ? (mapRule(rule, existing, bucket) ??
        mapRule(rule, (opts.starter ?? []).map((name) => ({ name, products: 0 })), bucket) ??
        rule.label)
      : ''

    let suggested = ''
    let confidence: CategorySuggestion['confidence'] = 'low'
    let reason = ''
    const top = ranked[0]
    const share = top && total ? top[1].score / total : 0
    const sizeNote = size && (bucket === 'liter' || bucket === 'large') ? ` · ${trimNumber(size.amount)} ${size.unit} is a backbar size` : ''

    if (top && (top[1].score >= 2.5 || top[1].n >= 2) && share >= 0.5) {
      suggested = top[0]
      const agrees = ruleCategory && fold(ruleCategory) === fold(top[0])
      confidence = share >= 0.7 && (top[1].n >= 2 || agrees) ? 'high' : 'medium'
      const like = top[1].brandHits >= 1 && brand ? `${p.brand.trim()} products` : 'products with a similar name'
      reason = `Like ${top[1].n} other ${like} you filed under ${top[0]}${sizeNote}`
    } else if (ruleCategory) {
      suggested = ruleCategory
      const existingHit = counts.has(ruleCategory)
      confidence = existingHit ? 'medium' : 'low'
      const word = (rule!.words.exec(text)?.[0] ?? '').trim()
      reason = `The name says “${word.toLowerCase()}”${existingHit ? '' : ' (new category)'}${sizeNote}`
    } else if (top) {
      suggested = top[0]
      confidence = 'low'
      reason = `Closest match among your products${sizeNote}`
    }

    if (current) {
      // Re-check mode: only speak up when we're sure it's misfiled.
      if (!suggested || fold(suggested) === fold(current) || confidence !== 'high') continue
      reason = `Filed under ${current}. ${reason}`
    }

    const alternatives = [...new Set([...ranked.map(([c]) => c), ruleCategory].filter((c) => c && c !== suggested && c !== current))].slice(0, 3)
    const formattedName = formatName(p.name)
    const formattedSize = formatSize(p.size)
    out.push({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      size: p.size,
      current,
      suggested,
      alternatives,
      confidence,
      reason,
      formattedName,
      formattedSize,
    })
  }
  const rank = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => rank[a.confidence] - rank[b.confidence] || a.suggested.localeCompare(b.suggested) || a.name.localeCompare(b.name))
}

/** Products whose name or size would read better, independent of category. */
export function formattingFixes(all: CategorizeInput[]) {
  return all
    .map((p) => ({ productId: p.id, name: p.name, size: p.size, formattedName: formatName(p.name), formattedSize: formatSize(p.size) }))
    .filter((p) => p.formattedName || p.formattedSize)
}
