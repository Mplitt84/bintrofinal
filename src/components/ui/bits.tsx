/** Small building blocks shared by every Bintro tab. */

export type Tone = 'good' | 'warn' | 'bad'

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
}

export function StatTile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-surface to-white border border-line rounded-2xl p-3.5 min-w-0">
      <span className="absolute left-3.5 top-0 w-6 h-[3px] rounded-b-full bg-gold/70" aria-hidden="true" />
      <b className={`num block text-2xl font-bold tracking-tight truncate ${tone ? TONE_TEXT[tone] : ''}`}>{value}</b>
      <span className="text-[13px] text-ink-2">{label}</span>
    </div>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 min-[560px]:grid-cols-4 gap-2.5 mb-5">{children}</div>
}

/** Product thumbnail: the looked-up photo when there is one, otherwise the brand initial. */
export function Thumb({
  imageUrl,
  label,
  size = 'md',
}: {
  imageUrl?: string
  label: string
  size?: 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11'
  return (
    <div
      className={`${box} rounded-xl bg-surface shrink-0 grid place-items-center overflow-hidden font-bold text-ink-2 text-[15px]`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" className="w-full h-full object-contain bg-white" />
      ) : (
        (label.trim()[0] ?? '?').toUpperCase()
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="text-center px-5 py-9 text-ink-2 bg-surface rounded-2xl">
      <b className="block text-ink text-[17px] mb-1">{title}</b>
      {children}
    </div>
  )
}

export function PageHead({
  title,
  lead,
  action,
}: {
  title: string
  lead: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <span className="block w-8 h-[3px] rounded-full bg-gradient-to-r from-gold to-gold-bright mt-1 mb-2" aria-hidden="true" />
        <h1 className="text-[28px] leading-tight tracking-tight font-bold mt-0 mb-1 text-royal">{title}</h1>
        <p className="text-ink-2 mt-0 mb-5">{lead}</p>
      </div>
      {action}
    </div>
  )
}

export function timeAgo(value: string | Date) {
  const s = (Date.now() - new Date(value).getTime()) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2)
}

/** Whole-dollar amount for stat tiles, e.g. "$128". */
export function dollarsShort(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}
