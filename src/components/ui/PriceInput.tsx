import { forwardRef, useId, useMemo, useState } from 'react'
import { centsToDollars } from './bits'

export type PriceSuggestion = { cents: number; hint: string }

/**
 * Money field with predicted amounts: focusing it drops down prices from earlier
 * entries (with where each came from), narrowed as digits are typed. Tap, arrow
 * keys + Enter, or Tab picks one.
 */
export const PriceInput = forwardRef<
  HTMLInputElement,
  {
    id: string
    value: string
    onChange: (value: string) => void
    onPick?: (value: string) => void
    suggestions: PriceSuggestion[]
    placeholder?: string
    align?: 'left' | 'right'
  }
>(function PriceInput({ id, value, onChange, onPick, suggestions, placeholder, align = 'left' }, ref) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = useMemo(() => {
    const typed = value.trim().replace(/^\$/, '')
    if (!typed) return suggestions
    return suggestions.filter((s) => {
      const d = centsToDollars(s.cents)
      return d.startsWith(typed) && Number(d) !== Number(typed)
    })
  }, [value, suggestions])
  const visible = open && matches.length > 0

  function pick(s: PriceSuggestion) {
    const v = centsToDollars(s.cents)
    onChange(v)
    setOpen(false)
    setActive(-1)
    onPick?.(v)
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        className="field-input num"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!visible) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => (i + 1) % matches.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => (i <= 0 ? matches.length - 1 : i - 1))
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault()
            pick(matches[active]!)
          } else if (e.key === 'Tab' && !e.shiftKey && (active >= 0 || value.trim())) {
            e.preventDefault()
            pick(matches[Math.max(0, active)]!)
          } else if (e.key === 'Escape') {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Prices from earlier entries"
          className={`absolute z-20 ${align === 'right' ? 'right-0' : 'left-0'} w-[min(260px,calc(100vw-56px))] mt-1 list-none m-0 p-1 bg-white border border-line rounded-xl shadow-card max-h-64 overflow-auto`}
        >
          <li role="presentation" className="px-3 pt-1.5 pb-1 text-[12px] font-semibold text-ink-2">
            From earlier entries
          </li>
          {matches.map((s, i) => (
            <li
              key={s.cents}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(s)
              }}
              className={`px-3 py-2 rounded-lg cursor-pointer ${i === active ? 'bg-action-tint' : 'hover:bg-surface'}`}
            >
              <span className="num block text-[15px] font-semibold">${centsToDollars(s.cents)}</span>
              <span className="block text-[12px] text-ink-2 truncate">{s.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
