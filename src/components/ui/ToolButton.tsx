/**
 * Bintro's round action button: a bold colored circle with an icon, the label
 * underneath, and an optional count badge. Colors are palette tokens (bg-action,
 * bg-gold, bg-good, bg-warn, bg-bad, bg-royal, bg-royal-2) so they follow the
 * business's palette.
 */
export function ToolButton({
  icon,
  color,
  label,
  badge,
  onClick,
  disabled = false,
  busy = false,
}: {
  icon: React.ReactNode
  color: string
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
        className={`relative grid place-items-center w-14 h-14 rounded-full text-white ${color} shadow-[0_6px_14px_-6px_rgba(0,0,0,0.45)] ring-4 ring-white transition-transform group-enabled:group-hover:-translate-y-0.5 group-enabled:group-active:scale-95 ${busy ? 'animate-pulse' : ''}`}
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
