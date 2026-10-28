import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownToLine, ArrowUpFromLine, Check, UserPlus, Users, X } from 'lucide-react'
import type { TeamMember } from './types'
import { deriveInitials } from '@/lib/inventory-defaults'

// Older key prefix kept with the rest of the device settings.
const ASK_KEY = 'shagnoir-ask-staff'

/** How often the Scan tab asks who's scanning. */
export type StaffAskMode = 'every' | 'idle'

/** In "idle" mode the picker comes back after this long without a scan. */
export const STAFF_IDLE_MINUTES = 10

export function getStaffAskMode(): StaffAskMode {
  if (typeof window === 'undefined') return 'every'
  return window.localStorage.getItem(ASK_KEY) === 'idle' ? 'idle' : 'every'
}

export function setStaffAskMode(mode: StaffAskMode) {
  window.localStorage.setItem(ASK_KEY, mode)
}

export type StaffPrompt = {
  /** Shown as a badge so staff see which way the scan goes. */
  direction?: 'in' | 'out'
}

/**
 * Centered "Who's scanning?" pop-up with a large tile per team member.
 * Used before scans and from the header name pill.
 */
export function StaffPicker({
  open,
  prompt,
  team,
  current,
  onPick,
  onClose,
  onManageTeam,
}: {
  open: boolean
  prompt: StaffPrompt
  team: TeamMember[]
  current: string
  onPick: (name: string) => void
  onClose: () => void
  onManageTeam: () => void
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft('')
    setAdding(team.length === 0)
    const opener = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      const selected = panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!panelRef.current?.contains(document.activeElement)) (selected ?? panelRef.current)?.focus()
    })
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
    // Only re-run when the picker opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const { direction } = prompt
  const DirIcon = direction === 'in' ? ArrowDownToLine : ArrowUpFromLine
  const title = direction === 'in' ? 'Who’s scanning in?' : direction === 'out' ? 'Who’s scanning out?' : 'Who’s working?'

  function submitNew(e: React.FormEvent) {
    e.preventDefault()
    const next = draft.trim().slice(0, 60)
    if (next) onPick(next)
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="sheet-scrim absolute inset-0 bg-royal/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="staff-pop outline-none relative w-full max-w-[520px] max-h-[88vh] overflow-auto bg-white rounded-[28px] px-5 pt-6 pb-5 shadow-[var(--shadow-lift)] text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 w-9 h-9 rounded-full border-0 bg-surface text-ink-2 grid place-items-center cursor-pointer hover:bg-surface-2"
        >
          <X size={18} />
        </button>

        <span className="brand-tile mx-auto w-14 h-14 rounded-full text-white grid place-items-center mb-3" aria-hidden="true">
          <Users size={26} />
        </span>
        {direction && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold mb-2 ${
              direction === 'in' ? 'bg-good-tint text-good' : 'bg-action-tint text-action'
            }`}
          >
            <DirIcon size={14} />
            {direction === 'in' ? 'Scan in' : 'Scan out'}
          </span>
        )}
        <h2 id={titleId} className="text-[26px] font-extrabold tracking-tight text-royal m-0 mb-1">
          {title}
        </h2>
        <p className="text-ink-2 text-sm m-0 mb-5">Tap your name. The scan is logged under you.</p>

        {team.length > 0 && (
          <div className="grid grid-cols-2 min-[440px]:grid-cols-3 gap-2.5 mb-4" role="group" aria-label="Team members">
            {team.map((m) => {
              const on = m.name === current
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(m.name)}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl px-2 pt-4 pb-3 cursor-pointer border-2 transition-colors ${
                    on ? 'border-action bg-action-tint' : 'border-line bg-white hover:bg-surface'
                  }`}
                >
                  <span
                    className={`w-14 h-14 rounded-full text-white text-[18px] font-bold grid place-items-center ${
                      on ? 'bg-action' : 'brand-tile'
                    }`}
                  >
                    {deriveInitials(m.name)}
                  </span>
                  <span className="text-[15px] font-bold text-ink leading-tight break-words max-w-full">{m.name}</span>
                  {on && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-action text-white grid place-items-center">
                      <Check size={14} strokeWidth={3} />
                      <span className="sr-only"> (last used)</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {adding ? (
          <form onSubmit={submitNew} className="flex gap-2 text-left">
            <label htmlFor="staff-new-name" className="sr-only">
              Your name
            </label>
            <input
              id="staff-new-name"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 60))}
              placeholder={team.length ? 'Someone new — type a name' : 'Type your name'}
              autoComplete="name"
              autoFocus
              className="field-input"
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={!draft.trim()}>
              <UserPlus size={18} />
              Go
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn-tonal w-full" onClick={() => setAdding(true)}>
            <UserPlus size={18} />
            Someone new
          </button>
        )}
        <button type="button" className="btn btn-text btn-sm mt-2" onClick={onManageTeam}>
          Manage team
        </button>
      </div>
    </div>,
    document.body,
  )
}
