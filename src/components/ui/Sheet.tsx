import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Bintro bottom sheet. Slides up from the bottom on phones and turns into a
 * centered dialog on wider screens. Closes on the scrim, Escape, or `onClose`.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Move focus into the sheet on open (unless a field autofocused) and hand it back on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      // With a sheet stacked on another (e.g. a pop-up over a form), Escape closes only the top one.
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      if (dialogs[dialogs.length - 1] === panelRef.current) onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center min-[700px]:items-center">
      <div className="sheet-scrim absolute inset-0 bg-royal/45" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`sheet-panel outline-none relative w-full max-h-[92vh] overflow-auto bg-white rounded-t-[24px] px-5 pt-2 pb-[calc(24px+env(safe-area-inset-bottom,0px))] min-[700px]:rounded-[24px] min-[700px]:pt-6 ${
          wide ? 'min-[700px]:w-[680px]' : 'min-[700px]:w-[560px]'
        }`}
      >
        <div className="w-10 h-1 rounded bg-line mx-auto mt-1 mb-3.5 min-[700px]:hidden" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 min-[700px]:top-4 w-9 h-9 rounded-full border-0 bg-surface text-ink-2 grid place-items-center cursor-pointer hover:bg-surface-2"
        >
          <X size={18} />
        </button>
        <h2 id={titleId} className="text-[22px] font-bold tracking-tight m-0 mb-1 pr-10">
          {title}
        </h2>
        {subtitle && <p className="text-ink-2 text-sm m-0 mb-4">{subtitle}</p>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Labelled input row used inside sheets. */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-2 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Cancel / confirm row pinned to the bottom of a sheet. */
export function SheetActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2.5 mt-5 [&>.btn]:flex-1">{children}</div>
}
