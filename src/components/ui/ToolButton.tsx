/**
 * Bintro's fixed action colors. Unlike the rest of the app these never follow the
 * business's palette: each action keeps the same color everywhere, on every theme,
 * so staff learn it by color (brand consistency). Use the tone for the action, not
 * for the screen: Smart par is always yellow, emailing is always royal blue.
 */
export const TOOL_TONES = {
  /** Garnet: the main brand action (count, snap & log, build order). */
  garnet: { bg: '#8B1A2F', fg: '#FFFFFF' },
  /** Bold yellow: Smart par. Dark icon for contrast. */
  yellow: { bg: '#F5B700', fg: '#2A1C00' },
  /** Royal blue: anything that emails. */
  royal: { bg: '#1D3FAF', fg: '#FFFFFF' },
  /** Green: deliveries coming in. */
  green: { bg: '#11804A', fg: '#FFFFFF' },
  /** Red: fix a problem (negative counts). */
  red: { bg: '#C62828', fg: '#FFFFFF' },
  /** Orange: missing information (costs). */
  orange: { bg: '#E46A12', fg: '#FFFFFF' },
  /** Purple: duplicates. */
  purple: { bg: '#6A3EA1', fg: '#FFFFFF' },
  /** Teal: files in and out (sales reports, CSV). */
  teal: { bg: '#0B7A84', fg: '#FFFFFF' },
  /** Charcoal: utilities (refresh, print). */
  charcoal: { bg: '#2F2B2C', fg: '#FFFFFF' },
} as const

export type ToolTone = keyof typeof TOOL_TONES

/** Round action button: a bold colored circle with an icon, the label underneath, and an optional count badge. */
export function ToolButton({
  icon,
  tone,
  label,
  badge,
  onClick,
  disabled = false,
  busy = false,
}: {
  icon: React.ReactNode
  tone: ToolTone
  label: string
  badge?: number
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={badge ? `${label}: ${badge}` : label}
      className="group flex flex-col items-center gap-1.5 shrink-0 w-[82px] bg-transparent border-0 p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span
        style={{ backgroundColor: TOOL_TONES[tone].bg, color: TOOL_TONES[tone].fg }}
        className={`relative grid place-items-center w-14 h-14 rounded-full shadow-[0_6px_14px_-6px_rgba(0,0,0,0.45)] ring-4 ring-white transition-transform group-enabled:group-hover:-translate-y-0.5 group-enabled:group-active:scale-95 ${busy ? 'animate-pulse' : ''}`}
      >
        {icon}
        {badge ? (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-ink text-[11px] font-extrabold grid place-items-center border-2 border-current shadow-sm">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[12px] font-semibold text-ink leading-tight text-center">{label}</span>
    </button>
  )
}

/** A row of ToolButtons that scrolls sideways on small screens. */
export function ToolRow({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={`flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 ${className}`} role="group" aria-label={label}>
      {children}
    </div>
  )
}
