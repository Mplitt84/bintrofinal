/**
 * The connections directory on Settings → Connections: the platforms each kind of
 * business most likely uses, curated (not a marketplace of randoms).
 *
 * - "soon": the platform has an open API Bintro can build on (often after a
 *   partner application). Shops can request it; requests are demand for the pitch.
 * - "upload": no API for outside apps. Works today through the sales report upload.
 * Square and QuickBooks are already live and shown above the directory.
 */
export type DirectoryStatus = 'soon' | 'upload'
export type DirectoryKind = 'Booking & POS' | 'Accounting'

export type DirectoryEntry = {
  id: string
  name: string
  kind: DirectoryKind
  status: DirectoryStatus
  /** Business types that commonly use it; empty = everyone. */
  types: string[]
  blurb: string
  website?: string
}

const BEAUTY: string[] = ['salon', 'barber', 'nails', 'brows', 'spa', 'other']

export const CONNECTION_DIRECTORY: DirectoryEntry[] = [
  { id: 'vagaro', name: 'Vagaro', kind: 'Booking & POS', status: 'soon', types: [...BEAUTY, 'tattoo'], blurb: 'Retail sales come off the shelf automatically.', website: 'https://www.vagaro.com' },
  { id: 'boulevard', name: 'Boulevard', kind: 'Booking & POS', status: 'soon', types: ['salon', 'spa', 'brows', 'nails'], blurb: 'Sales and services sync, so back bar and retail stay counted.', website: 'https://www.joinblvd.com' },
  { id: 'mindbody', name: 'Mindbody', kind: 'Booking & POS', status: 'soon', types: ['spa', 'salon', 'nails', 'brows', 'other'], blurb: 'Retail sales sync from your Mindbody point of sale.', website: 'https://www.mindbodyonline.com' },
  { id: 'zenoti', name: 'Zenoti', kind: 'Booking & POS', status: 'soon', types: ['salon', 'spa', 'other'], blurb: 'Built for multi-location salons and spas.', website: 'https://www.zenoti.com' },
  { id: 'phorest', name: 'Phorest', kind: 'Booking & POS', status: 'soon', types: ['salon', 'barber', 'nails', 'brows'], blurb: 'Product sales and stock stay in step.', website: 'https://www.phorest.com' },
  { id: 'meevo', name: 'Meevo', kind: 'Booking & POS', status: 'soon', types: ['salon', 'spa'], blurb: 'Through the MeevoXchange marketplace.', website: 'https://www.meevo.com' },
  { id: 'fresha', name: 'Fresha', kind: 'Booking & POS', status: 'upload', types: [...BEAUTY], blurb: 'Upload your product sales report and Bintro takes it off the shelf.', website: 'https://www.fresha.com' },
  { id: 'glossgenius', name: 'GlossGenius', kind: 'Booking & POS', status: 'upload', types: ['salon', 'barber', 'nails', 'brows', 'tattoo'], blurb: 'Upload your product sales report and Bintro takes it off the shelf.', website: 'https://glossgenius.com' },
  { id: 'mangomint', name: 'Mangomint', kind: 'Booking & POS', status: 'upload', types: ['salon', 'spa', 'nails', 'brows'], blurb: 'Upload your product sales report and Bintro takes it off the shelf.', website: 'https://www.mangomint.com' },
  { id: 'booksy', name: 'Booksy', kind: 'Booking & POS', status: 'upload', types: ['barber', 'salon', 'tattoo', 'nails'], blurb: 'Upload your product sales report and Bintro takes it off the shelf.', website: 'https://booksy.com' },
  { id: 'clover', name: 'Clover', kind: 'Booking & POS', status: 'soon', types: ['other'], blurb: 'Sales from your Clover register come off the shelf.', website: 'https://www.clover.com' },
  { id: 'xero', name: 'Xero', kind: 'Accounting', status: 'soon', types: [], blurb: 'Purchases and cost of goods go straight to your books.', website: 'https://www.xero.com' },
]

export function directoryFor(type: string) {
  return CONNECTION_DIRECTORY.filter((e) => e.types.length === 0 || e.types.includes(type))
}
