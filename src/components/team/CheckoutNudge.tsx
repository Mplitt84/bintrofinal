import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { TOOL_TONES } from '@/components/ui/ToolButton'
import { appreciation, localDayKey, nameKey, HOUSEKEEPING_DEFAULTS, STATION_TASK_KEY, type HkReminder } from '@/lib/housekeeping'
import { checkHousekeeping, dismissHousekeepingReminder, getCheckoutReminders } from '@/server/housekeeping.functions'

const SEEN_KEY = 'bintro.hkRemindersSeen'
const POLL_MS = 90_000

function seenIds(): number[] {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]') as number[]
  } catch {
    return []
  }
}
function markSeen(id: number) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([id, ...seenIds()].slice(0, 200)))
  } catch {
    // Private mode: it may show again, which is harmless.
  }
}

/**
 * App-wide: when Square says a client just checked out, the stylist who rang it up
 * (or whoever is on this device, when Square doesn't say) gets a nudge to reset their
 * station. One tap logs it in Housekeeping and says thank you.
 */
export function CheckoutNudge({
  staffName,
  enabled,
  onOpenHousekeeping,
  onVisible,
}: {
  staffName: string
  enabled: boolean
  onOpenHousekeeping: () => void
  /** Lets the tip pop-up wait while a reminder is on screen, so the two never stack. */
  onVisible?: (showing: boolean) => void
}) {
  const toast = useToast()
  const [reminder, setReminder] = useState<HkReminder | null>(null)
  const [stationId, setStationId] = useState<number | null>(null)
  const me = staffName.trim()

  const poll = useCallback(async () => {
    if (!enabled || !me) return
    try {
      const { reminders, stationTaskId } = await getCheckoutReminders()
      setStationId(stationTaskId)
      const seen = new Set(seenIds())
      const next = reminders.find((r) => !seen.has(r.id) && (!r.staffName || nameKey(r.staffName) === nameKey(me)))
      if (next) setReminder((cur) => cur ?? next)
    } catch {
      // Signed out or offline: try again next round.
    }
  }, [enabled, me])

  useEffect(() => {
    void poll()
    const timer = setInterval(poll, POLL_MS)
    return () => clearInterval(timer)
  }, [poll])

  const showing = Boolean(reminder && enabled)
  useEffect(() => onVisible?.(showing), [showing, onVisible])

  if (!reminder || !enabled) return null

  const close = () => {
    markSeen(reminder.id)
    setReminder(null)
  }

  async function reset() {
    if (!reminder) return
    close()
    if (!stationId) return onOpenHousekeeping()
    const r = await checkHousekeeping({ data: { taskId: stationId, staffName: me, dayKey: localDayKey(), reminderId: reminder.id } })
    if (!r.ok) return toast(r.message)
    const task = HOUSEKEEPING_DEFAULTS.find((t) => t.key === STATION_TASK_KEY)!
    const thanks = appreciation({ staffName: me, task, seed: reminder.id })
    toast(`${thanks.title} ${thanks.body}`)
  }

  return (
    <aside
      role="status"
      aria-label="Checkout reminder"
      className="tip-nudge print:hidden fixed z-[44] right-4 left-4 min-[560px]:left-auto min-[560px]:w-[380px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6"
    >
      <div className="bg-white rounded-2xl p-4 pr-3 border border-line shadow-[var(--shadow-lift)]" style={{ boxShadow: `inset 4px 0 0 ${TOOL_TONES.garnet.bg}, var(--shadow-lift)` }}>
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: TOOL_TONES.garnet.bg, color: '#fff' }} aria-hidden="true">
            <Bell size={19} />
          </span>
          <div className="flex-1 min-w-0">
            <b className="block text-[16px] leading-snug text-royal">A client just checked out</b>
            <p className="m-0 mt-0.5 text-[14px] leading-snug">
              {reminder.detail}. Reset and disinfect your station so the next client walks into a fresh one.
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Not now" className="w-8 h-8 -mt-1 rounded-full border-0 bg-transparent text-ink-2 grid place-items-center cursor-pointer shrink-0">
            <X size={17} />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-3 pl-[52px] flex-wrap">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void reset()}>
            <Check size={15} /> Station reset
          </button>
          <button
            type="button"
            className="btn btn-text btn-sm"
            onClick={async () => {
              close()
              await dismissHousekeepingReminder({ data: { id: reminder.id, staffName: me } })
            }}
          >
            Not mine
          </button>
        </div>
      </div>
    </aside>
  )
}
