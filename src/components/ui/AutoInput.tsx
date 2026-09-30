import { useId, useMemo, useState } from 'react'

/**
 * Ranks suggestions for what's been typed so far: whole-value prefix matches
 * first, then entries where every typed word starts a word in the suggestion
 * ("lor maj" finds "L'Oréal Majirel"). Accents and case are ignored.
 */
export function rankSuggestions(query: string, options: string[], limit = 6) {
  const fold = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = fold(query.trim())
  if (!q) return options.slice(0, limit)
  const words = q.split(/\s+/)
  const scored: { value: string; score: number }[] = []
  for (const value of options) {
    const v = fold(value)
    if (v === q) continue
    const vWords = v.split(/[\s\-/.,'()]+/)
    let score = -1
    if (v.startsWith(q)) score = 3
    else if (words.every((w) => vWords.some((vw) => vw.startsWith(w)))) score = 2
    else if (v.includes(q)) score = 1
    if (score > 0) scored.push({ value, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.value.length - b.value.length || a.value.localeCompare(b.value))
    .slice(0, limit)
    .map((s) => s.value)
}

/**
 * Text field with word prediction: a short list of matching suggestions drops
 * down as staff type, pickable by tap or arrow keys + Enter.
 */
export function AutoInput({
  id,
  value,
  onChange,
  onPick,
  suggestions,
  placeholder,
  className = 'field-input',
  inputMode,
  autoFocus,
  showWhenEmpty = false,
  onBlur,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onPick?: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoFocus?: boolean
  showWhenEmpty?: boolean
  onBlur?: () => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = useMemo(
    () => (value.trim() || showWhenEmpty ? rankSuggestions(value, suggestions) : []),
    [value, suggestions, showWhenEmpty],
  )
  const visible = open && matches.length > 0

  function pick(v: string) {
    onChange(v)
    onPick?.(v)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className="relative">
      <input
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoFocus={autoFocus}
        autoComplete="off"
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
        onBlur={() => {
          // Let a tap on a suggestion land before the list closes.
          setTimeout(() => setOpen(false), 120)
          onBlur?.()
        }}
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
          } else if (e.key === 'Tab' && matches.length > 0 && value.trim()) {
            // Tab accepts the top prediction, like a phone keyboard.
            if (active >= 0 || matches[0]!.toLowerCase().startsWith(value.trim().toLowerCase())) {
              e.preventDefault()
              pick(matches[Math.max(0, active)]!)
            }
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
          className="absolute z-20 left-0 right-0 mt-1 list-none m-0 p-1 bg-white border border-line rounded-xl shadow-card max-h-60 overflow-auto"
        >
          {matches.map((m, i) => (
            <li
              key={m}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(m)
              }}
              className={`px-3 py-2.5 rounded-lg cursor-pointer text-[15px] truncate ${i === active ? 'bg-action-tint' : 'hover:bg-surface'}`}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One-tap answers under a field, e.g. common sizes for this kind of business. */
export function QuickChips({
  options,
  value,
  onPick,
  label,
}: {
  options: string[]
  value: string
  onPick: (value: string) => void
  label: string
}) {
  if (options.length === 0) return null
  return (
    <div className="flex gap-1.5 overflow-x-auto -mt-1.5 mb-3 pb-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="chip !px-2.5 !py-1 !text-[13px]"
          aria-pressed={value.trim().toLowerCase() === o.toLowerCase()}
          onClick={() => onPick(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
