import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { applyProductTidyFn, getCategorySuggestions } from '@/server/tidy.functions'
import type { CategorySuggestion } from '@/lib/categorize'

type Fix = { productId: number; name: string; size: string; formattedName: string | null; formattedSize: string | null }
type Data = { suggestions: CategorySuggestion[]; formatting: Fix[]; categories: string[] }
type Row = { on: boolean; category: string; format: boolean }

const DOT = { high: 'bg-good', medium: 'bg-warn', low: 'bg-line' } as const
const SURE = { high: 'Sure', medium: 'Likely', low: 'A guess' } as const

/**
 * Sort into categories: Bintro guesses each product's category from its name, brand
 * and size (`suggestCategories`), and offers tidier names and sizes. Staff tick,
 * correct any guess by tapping another category or typing one, and apply. Undo puts
 * every product back as it was.
 */
export function AutoSortSheet({
  open,
  onClose,
  onDone,
  startWith = 'sort',
}: {
  open: boolean
  onClose: () => void
  onDone?: () => void | Promise<void>
  startWith?: 'sort' | 'format'
}) {
  const toast = useToast()
  const [mode, setMode] = useState<'sort' | 'recheck' | 'format'>('sort')
  const [data, setData] = useState<Data | null>(null)
  const [rows, setRows] = useState<Record<number, Row>>({})
  const [saving, setSaving] = useState(false)

  async function load(next = mode) {
    setData(null)
    try {
      const d = (await getCategorySuggestions({ data: { recheck: next === 'recheck' } })) as Data
      setData(d)
      setRows(
        Object.fromEntries([
          ...d.formatting.map((f) => [f.productId, { on: true, category: '', format: true }]),
          ...d.suggestions.map((s) => [s.productId, { on: s.confidence !== 'low' && Boolean(s.suggested), category: s.suggested, format: Boolean(s.formattedName || s.formattedSize) }]),
        ]),
      )
    } catch {
      setData({ suggestions: [], formatting: [], categories: [] })
    }
  }

  useEffect(() => {
    if (!open) return
    setMode(startWith)
    load(startWith)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const list = mode === 'format' ? [] : (data?.suggestions ?? [])
  const fixes = mode === 'format' ? (data?.formatting ?? []) : []
  const ticked = mode === 'format' ? fixes.filter((f) => rows[f.productId]?.on) : list.filter((s) => rows[s.productId]?.on && rows[s.productId].category.trim())
  const counts = useMemo(() => {
    const s = data?.suggestions ?? []
    return { high: s.filter((x) => x.confidence === 'high').length, all: s.length }
  }, [data])

  const set = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))

  function switchMode(next: typeof mode) {
    setMode(next)
    if (next === 'format') return
    if (next !== mode && (next === 'recheck' || mode === 'recheck')) load(next)
  }

  async function apply() {
    const items =
      mode === 'format'
        ? fixes
            .filter((f) => rows[f.productId]?.on)
            .map((f) => ({ productId: f.productId, ...(f.formattedName ? { name: f.formattedName } : {}), ...(f.formattedSize ? { size: f.formattedSize } : {}) }))
        : list
            .filter((s) => rows[s.productId]?.on && rows[s.productId].category.trim())
            .map((s) => {
              const r = rows[s.productId]
              return {
                productId: s.productId,
                category: r.category.trim(),
                ...(r.format && s.formattedName ? { name: s.formattedName } : {}),
                ...(r.format && s.formattedSize ? { size: s.formattedSize } : {}),
              }
            })
    if (items.length === 0) return
    setSaving(true)
    try {
      const res = (await applyProductTidyFn({ data: { items } })) as { changed: number; before: { productId: number; category?: string; name?: string; size?: string }[] }
      const undo = async () => {
        if (res.before.length) await applyProductTidyFn({ data: { items: res.before } })
        await onDone?.()
        if (open) await load()
      }
      toast(`${res.changed} product${res.changed === 1 ? '' : 's'} updated`, undo)
      await onDone?.()
      await load()
    } catch {
      toast("Couldn't save those. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sort into categories"
      subtitle="Bintro reads each product's name, brand and size and guesses where it goes. Check each guess, tap another to change it, then apply."
    >
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="What to check">
        <button type="button" className="chip" aria-pressed={mode === 'sort'} onClick={() => switchMode('sort')}>
          No category{mode !== 'recheck' && data ? ` · ${counts.all}` : ''}
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'recheck'} onClick={() => switchMode('recheck')}>
          Check filed ones
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'format'} onClick={() => switchMode('format')}>
          Names & sizes{data ? ` · ${data.formatting.length}` : ''}
        </button>
      </div>

      {!data ? (
        <div className="grid gap-2">
          <div className="skel h-16 rounded-xl" />
          <div className="skel h-16 rounded-xl" />
        </div>
      ) : mode === 'format' ? (
        fixes.length === 0 ? (
          <p className="text-sm text-ink-2">Every filed product's name and size already reads well.</p>
        ) : (
          <ul className="list-none m-0 p-0 max-h-[60vh] overflow-auto grid gap-2">
            {fixes.map((f) => (
              <li key={f.productId} className="bg-surface rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={rows[f.productId]?.on ?? false} onChange={(e) => set(f.productId, { on: e.target.checked })} />
                  <span className="text-sm min-w-0">
                    <span className="block text-ink-2 line-through break-words">{[f.name, f.size].filter(Boolean).join(' · ')}</span>
                    <span className="block font-semibold break-words">{[f.formattedName ?? f.name, f.formattedSize ?? f.size].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )
      ) : list.length === 0 ? (
        <p className="text-sm text-ink-2">
          {mode === 'recheck' ? 'Nothing looks filed in the wrong place.' : 'Every product has a category.'}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-2 text-[12px] text-ink-2">
            <span>
              {ticked.length} of {list.length} ticked
            </span>
            <span className="flex gap-1">
              <button type="button" className="btn btn-text btn-sm" onClick={() => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, on: Boolean(v.category) }])))}>
                Tick all
              </button>
              <button type="button" className="btn btn-text btn-sm" onClick={() => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, on: false }])))}>
                Clear
              </button>
            </span>
          </div>
          <datalist id="autosort-categories">
            {data.categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <ul className="list-none m-0 p-0 max-h-[58vh] overflow-auto grid gap-2">
            {list.map((s) => {
              const r = rows[s.productId] ?? { on: false, category: '', format: false }
              const choices = [...new Set([s.suggested, ...s.alternatives].filter(Boolean))]
              return (
                <li key={s.productId} className={`rounded-xl p-3 ${r.on ? 'bg-surface' : 'bg-surface/50'}`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`Use this for ${s.name}`}
                      checked={r.on}
                      onChange={(e) => set(s.productId, { on: e.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold break-words">{s.formattedName && r.format ? s.formattedName : s.name}</div>
                      <div className="text-[12px] text-ink-2">
                        {[s.brand, (r.format && s.formattedSize) || s.size].filter(Boolean).join(' · ') || 'No brand or size'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {choices.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="chip !py-1 !text-[13px]"
                            aria-pressed={r.category === c}
                            onClick={() => set(s.productId, { category: c, on: true })}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <input
                        className="field-input !py-1.5 !text-[13px] mt-2"
                        list="autosort-categories"
                        placeholder="Or type a category"
                        value={r.category}
                        onChange={(e) => set(s.productId, { category: e.target.value, on: Boolean(e.target.value.trim()) })}
                      />
                      <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-ink-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${DOT[s.confidence]}`} aria-hidden />
                        <span>
                          <b className="font-semibold text-ink">{SURE[s.confidence]}</b>
                          {s.reason ? ` · ${s.reason}` : ''}
                        </span>
                      </div>
                      {(s.formattedName || s.formattedSize) && (
                        <label className="flex items-center gap-2 mt-1.5 text-[12px] cursor-pointer">
                          <input type="checkbox" checked={r.format} onChange={(e) => set(s.productId, { format: e.target.checked })} />
                          Tidy the name and size{r.format ? '' : ` (was: ${[s.name, s.size].filter(Boolean).join(' · ')})`}
                        </label>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || ticked.length === 0} onClick={apply}>
          {saving ? 'Saving…' : `Apply ${ticked.length || ''}`.trim()}
        </button>
      </SheetActions>
    </Sheet>
  )
}
