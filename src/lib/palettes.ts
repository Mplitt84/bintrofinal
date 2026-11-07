/**
 * Display color palettes a business can pick in Settings → Look & feel to match its brand.
 * Each palette swaps the theme tokens in `src/styles.css` (`--color-*`); status colors
 * (good / warn / bad) stay the same so stock levels read the same everywhere.
 * `burgundy-olive` is the default; `royal` is the original Bintro look.
 */

export type PaletteFamily = 'warm' | 'cool' | 'earthy' | 'mono'

export const PALETTE_FAMILIES: { id: PaletteFamily; label: string; blurb: string }[] = [
  { id: 'warm', label: 'Warm', blurb: 'Burgundy, olive, terracotta and rose gold' },
  { id: 'cool', label: 'Cool', blurb: 'Royal blue, ocean teal and lavender' },
  { id: 'earthy', label: 'Earthy', blurb: 'Sage, olive, walnut and sand' },
  { id: 'mono', label: 'Black & grey', blurb: 'Charcoal, graphite and silver' },
]

type Tokens = {
  page: string
  surface: string
  'surface-2': string
  ink: string
  'ink-2': string
  line: string
  action: string
  'action-press': string
  'action-tint': string
  royal: string
  'royal-2': string
  gold: string
  'gold-bright': string
  'gold-ink': string
  'gold-tint': string
}

export type Palette = { id: string; family: PaletteFamily; label: string; colors: Tokens }

export const PALETTES: Palette[] = [
  {
    id: 'burgundy-olive',
    family: 'warm',
    label: 'Burgundy, olive & cream',
    colors: {
      page: '#fdf9f1', surface: '#f6efe2', 'surface-2': '#ece3d2', ink: '#2a1719', 'ink-2': '#6a5853', line: '#e8dfcd',
      action: '#7a1f35', 'action-press': '#5f1729', 'action-tint': '#f5e6e8', royal: '#3f0e1b', 'royal-2': '#9a2d47',
      gold: '#7d8a3a', 'gold-bright': '#b9c46e', 'gold-ink': '#4d571b', 'gold-tint': '#f1f1dc',
    },
  },
  {
    id: 'terracotta',
    family: 'warm',
    label: 'Terracotta & honey',
    colors: {
      page: '#ffffff', surface: '#faf5f2', 'surface-2': '#f1e8e2', ink: '#2b1a14', 'ink-2': '#6e5a52', line: '#eee3dc',
      action: '#b8461f', 'action-press': '#96381a', 'action-tint': '#fbeae3', royal: '#4a1d10', 'royal-2': '#d2602f',
      gold: '#d9a03a', 'gold-bright': '#f3c96b', 'gold-ink': '#845406', 'gold-tint': '#fdf5e4',
    },
  },
  {
    id: 'rose',
    family: 'warm',
    label: 'Burgundy & rose gold',
    colors: {
      page: '#ffffff', surface: '#fbf4f6', 'surface-2': '#f2e6ea', ink: '#2c141c', 'ink-2': '#6f5860', line: '#efe2e7',
      action: '#9c1d4a', 'action-press': '#7f173c', 'action-tint': '#fbe8ef', royal: '#45081f', 'royal-2': '#c0325f',
      gold: '#c48b74', 'gold-bright': '#ebbfa9', 'gold-ink': '#8a4b33', 'gold-tint': '#fcf1ec',
    },
  },
  {
    id: 'royal',
    family: 'cool',
    label: 'Royal blue & gold',
    colors: {
      page: '#ffffff', surface: '#f3f5fa', 'surface-2': '#e7eaf3', ink: '#121a36', 'ink-2': '#545c78', line: '#e1e5ef',
      action: '#1f3fb8', 'action-press': '#16308f', 'action-tint': '#e8edfc', royal: '#0d1b52', 'royal-2': '#2a4fd6',
      gold: '#c99a2e', 'gold-bright': '#f0c75e', 'gold-ink': '#7f5c05', 'gold-tint': '#fcf6e6',
    },
  },
  {
    id: 'ocean',
    family: 'cool',
    label: 'Ocean teal & sky',
    colors: {
      page: '#ffffff', surface: '#f2f6f7', 'surface-2': '#e4ecee', ink: '#10262c', 'ink-2': '#4f6469', line: '#dde7e9',
      action: '#0f6e7a', 'action-press': '#0b5761', 'action-tint': '#e3f3f4', royal: '#0b2f3a', 'royal-2': '#138a96',
      gold: '#4c9ac0', 'gold-bright': '#8fd0ec', 'gold-ink': '#1e5f80', 'gold-tint': '#eaf5fb',
    },
  },
  {
    id: 'lavender',
    family: 'cool',
    label: 'Violet & lilac',
    colors: {
      page: '#ffffff', surface: '#f5f4fa', 'surface-2': '#eae7f3', ink: '#1d1833', 'ink-2': '#5d5873', line: '#e6e3ef',
      action: '#5b3fb8', 'action-press': '#47309a', 'action-tint': '#eeeafb', royal: '#2a1b5c', 'royal-2': '#7154d6',
      gold: '#b48fd8', 'gold-bright': '#dcc4f5', 'gold-ink': '#6a3fa0', 'gold-tint': '#f6f0fc',
    },
  },
  {
    id: 'sage',
    family: 'earthy',
    label: 'Sage & brass',
    colors: {
      page: '#ffffff', surface: '#f5f4ee', 'surface-2': '#ebe9df', ink: '#1f2219', 'ink-2': '#5d6052', line: '#e5e3d8',
      action: '#4f6b3a', 'action-press': '#3f572e', 'action-tint': '#edf2e6', royal: '#26331c', 'royal-2': '#6a8a50',
      gold: '#b5874a', 'gold-bright': '#dcb57a', 'gold-ink': '#74501d', 'gold-tint': '#f8f1e5',
    },
  },
  {
    id: 'walnut',
    family: 'earthy',
    label: 'Walnut & sand',
    colors: {
      page: '#ffffff', surface: '#f7f3ee', 'surface-2': '#ede6dd', ink: '#261c14', 'ink-2': '#64584d', line: '#e8e0d6',
      action: '#8a5a35', 'action-press': '#6f4729', 'action-tint': '#f5ece4', royal: '#3a2617', 'royal-2': '#a8744a',
      gold: '#b09a5b', 'gold-bright': '#d9c58a', 'gold-ink': '#6b5a22', 'gold-tint': '#f7f3e6',
    },
  },
  {
    id: 'charcoal',
    family: 'mono',
    label: 'Charcoal & silver',
    colors: {
      page: '#ffffff', surface: '#f4f4f4', 'surface-2': '#e8e8e8', ink: '#151515', 'ink-2': '#5c5c5c', line: '#e2e2e2',
      action: '#2b2b2b', 'action-press': '#141414', 'action-tint': '#ececec', royal: '#111111', 'royal-2': '#4a4a4a',
      gold: '#8c8c8c', 'gold-bright': '#c7c7c7', 'gold-ink': '#4d4d4d', 'gold-tint': '#f3f3f3',
    },
  },
  {
    id: 'graphite',
    family: 'mono',
    label: 'Graphite & slate',
    colors: {
      page: '#ffffff', surface: '#f3f4f6', 'surface-2': '#e6e9ec', ink: '#171b20', 'ink-2': '#59616b', line: '#e0e3e7',
      action: '#3d4752', 'action-press': '#2c343c', 'action-tint': '#e9ecef', royal: '#1b2026', 'royal-2': '#5a6672',
      gold: '#9aa3ad', 'gold-bright': '#d0d5db', 'gold-ink': '#4f5864', 'gold-tint': '#f2f4f6',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'burgundy-olive'

export function paletteById(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID)!
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/** CSS custom properties for a palette, for `style` on <html> or a wrapper element. */
export function paletteStyle(id: string | null | undefined): Record<string, string> {
  const { colors } = paletteById(id)
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(colors)) vars[`--color-${key}`] = value
  // Shadows are tinted with the palette's deepest color.
  const deep = rgb(colors.royal)
  vars['--shadow-card'] = `0 1px 2px rgba(${deep}, 0.06), 0 4px 16px rgba(${deep}, 0.07)`
  vars['--shadow-lift'] = `0 2px 6px rgba(${deep}, 0.08), 0 18px 40px -12px rgba(${deep}, 0.28)`
  return vars
}
