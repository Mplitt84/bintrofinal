import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Boxes, CalendarClock, ChevronLeft, ChevronRight, Leaf, Lightbulb, PiggyBank, X } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { useBusiness } from '@/components/business/BusinessContext'
import { TIP_CATEGORIES, dayNumber, tipsFor, type Tip, type TipCategory, type TipTab } from '@/lib/tips'

const SEEN_DAY_KEY = 'bintro-tips-seen-day'
const AUTO_KEY = 'bintro-tips-auto'

export type TipNavigate = (tab: TipTab, section?: 'import' | 'categories') => void

const CATEGORY_ICON: Record<TipCategory, typeof Lightbulb> = {
  save: PiggyBank,
  plan: CalendarClock,
  green: Leaf,
  stock: Boxes,
}

function categoryLabel(id: TipCategory) {
  return TIP_CATEGORIES.find((c) => c.id === id)?.label ?? ''
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode: tips still work, they just may pop up again.
  }
}

/** True until today's tip has been seen (pop-up shown or sheet opened). */
export function useFreshTip() {
  const [fresh, setFresh] = useState(false)
  useEffect(() => {
    setFresh(readStorage(SEEN_DAY_KEY) !== String(dayNumber()))
  }, [])
  const markSeen = useCallback(() => {
    writeStorage(SEEN_DAY_KEY, String(dayNumber()))
    setFresh(false)
  }, [])
  return { fresh, markSeen }
}

/** Gold light bulb for the header. Glows gently while today's tip is unread. */
export function TipBulb({ onClick, fresh }: { onClick: () => void; fresh: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-fresh={fresh}
      className="tip-bulb relative w-10 h-10"
      aria-label={fresh ? "Tips: today's tip is ready" : 'Tips for saving money, planning ahead and wasting less'}
    >
      <Lightbulb size={20} strokeWidth={2.2} />
      {fresh && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-action ring-2 ring-white" aria-hidden="true" />
      )}
    </button>
  )
}

function CategoryBadge({ category }: { category: TipCategory }) {
  const Icon = CATEGORY_ICON[category]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-royal text-white text-[12px] font-semibold pl-2 pr-2.5 py-1">
      <Icon size={13} className="text-gold-bright" />
      {categoryLabel(category)}
    </span>
  )
}

/** Browsable tips: filter by theme, step through with the arrows or ← / →. */
export function TipSheet({
  open,
  onClose,
  tab,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  tab: TipTab
  onNavigate: TipNavigate
}) {
  const { profile } = useBusiness()
  const [category, setCategory] = useState<TipCategory | null>(null)
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)
  const tips = useMemo(() => tipsFor(profile.businessType, tab, category ?? undefined), [profile.businessType, tab, category])
  const tip = tips[Math.min(index, tips.length - 1)]

  useEffect(() => {
    if (!open) return
    setIndex(0)
    setAuto(readStorage(AUTO_KEY) !== '0')
  }, [open, tab])

  useEffect(() => {
    if (!open || tips.length < 2) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % tips.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + tips.length) % tips.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, tips.length])

  function pick(next: TipCategory | null) {
    setCategory(next)
    setIndex(0)
  }

  function toggleAuto(next: boolean) {
    setAuto(next)
    writeStorage(AUTO_KEY, next ? '1' : '0')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tips"
      subtitle="Small habits that save money, prepare for the next order and cut waste."
    >
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4 [scrollbar-width:none]" role="group" aria-label="Tip themes">
        <button type="button" className="chip" aria-pressed={category === null} onClick={() => pick(null)}>
          All
        </button>
        {TIP_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c.id]
          return (
            <button
              key={c.id}
              type="button"
              className="chip flex items-center gap-1.5"
              aria-pressed={category === c.id}
              onClick={() => pick(c.id)}
            >
              <Icon size={15} />
              {c.label}
            </button>
          )
        })}
      </div>

      {tip ? (
        <article key={tip.id} className="tip-card tip-swap p-5 min-h-[220px] flex flex-col" aria-live="polite">
          <Lightbulb
            size={128}
            strokeWidth={1.2}
            className="absolute -right-6 -top-4 text-gold opacity-[0.16] pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3 mb-3 relative">
            <CategoryBadge category={tip.category} />
            <span className="num text-[12px] font-semibold text-gold-ink">
              {Math.min(index, tips.length - 1) + 1} / {tips.length}
            </span>
          </div>
          <h3 className="relative text-[20px] leading-snug font-bold tracking-tight m-0 mb-2 text-royal">{tip.title}</h3>
          <p className="relative text-[15px] text-ink m-0">{tip.body}</p>
          {tip.action && (
            <div className="relative mt-auto pt-4">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose()
                  onNavigate(tip.action!.tab, tip.action!.section)
                }}
              >
                {tip.action.label}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </article>
      ) : (
        <p className="text-ink-2">No tips in this theme for your business type yet.</p>
      )}

      {tips.length > 1 && (
        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            className="btn btn-tonal !px-4"
            onClick={() => setIndex((i) => (i - 1 + tips.length) % tips.length)}
            aria-label="Previous tip"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 flex justify-center gap-1.5" aria-hidden="true">
            {tips.length <= 12 && tips.map((t, i) => (
              <span
                key={t.id}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-gold' : 'w-1.5 bg-line'}`}
              />
            ))}
          </div>
          <button type="button" className="btn btn-gold" onClick={() => setIndex((i) => (i + 1) % tips.length)}>
            Next tip
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <label className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-line cursor-pointer">
        <span className="text-sm">
          <b className="block">Daily tip pop-up</b>
          <span className="text-ink-2 text-[13px]">One short tip a day, matched to the tab you're on.</span>
        </span>
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => toggleAuto(e.target.checked)}
          className="w-5 h-5 accent-[var(--color-action)] shrink-0"
        />
      </label>
    </Sheet>
  )
}

/**
 * Once-a-day pop-up with a tip for the current tab. Waits a few seconds after
 * load, stays out of the way of open sheets, and can be turned off in the tip sheet.
 */
export function TipNudge({
  tab,
  enabled,
  onSeen,
  onOpenAll,
  onNavigate,
}: {
  tab: TipTab
  /** False while the day's tip has already been seen. */
  enabled: boolean
  onSeen: () => void
  onOpenAll: () => void
  onNavigate: TipNavigate
}) {
  const { profile } = useBusiness()
  const [tip, setTip] = useState<Tip | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!enabled || tip || tab === 'settings' || readStorage(AUTO_KEY) === '0') return
    const timer = setTimeout(() => {
      // Don't cover a form or pop-up someone is in the middle of.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const first = tipsFor(profile.businessType, tab)[0]
      if (!first) return
      setTip(first)
      setOffset(0)
      onSeen()
    }, 3500)
    return () => clearTimeout(timer)
  }, [enabled, tab, tip, profile.businessType, onSeen])

  if (!tip) return null

  function next() {
    const list = tipsFor(profile.businessType, tab)
    const i = (offset + 1) % list.length
    setOffset(i)
    setTip(list[i])
  }

  return (
    <aside
      role="status"
      aria-label="Tip of the day"
      className="tip-nudge print:hidden fixed z-40 right-4 left-4 min-[560px]:left-auto min-[560px]:w-[380px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6"
    >
      <div className="tip-card p-4 pr-3" style={{ boxShadow: 'var(--shadow-lift), inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 35%, transparent)' }}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full brand-tile grid place-items-center shrink-0 text-gold-bright" aria-hidden="true">
            <Lightbulb size={20} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1" key={tip.id}>
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-ink">
              Tip of the day · {categoryLabel(tip.category)}
            </p>
            <b className="block text-[16px] leading-snug text-royal mt-0.5">{tip.title}</b>
            <p className="m-0 mt-1 text-[14px] text-ink leading-snug">{tip.body}</p>
          </div>
          <button
            type="button"
            onClick={() => setTip(null)}
            aria-label="Dismiss tip"
            className="w-8 h-8 -mt-1 rounded-full border-0 bg-transparent text-ink-2 grid place-items-center cursor-pointer hover:bg-white/70 shrink-0"
          >
            <X size={17} />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-3 pl-[52px] flex-wrap">
          {tip.action && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTip(null)
                onNavigate(tip.action!.tab, tip.action!.section)
              }}
            >
              {tip.action.label}
            </button>
          )}
          <button type="button" className="btn btn-text btn-sm" onClick={next}>
            Next
          </button>
          <button
            type="button"
            className="btn btn-text btn-sm !text-gold-ink"
            onClick={() => {
              setTip(null)
              onOpenAll()
            }}
          >
            All tips
          </button>
        </div>
      </div>
    </aside>
  )
}
