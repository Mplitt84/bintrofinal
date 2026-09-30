import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { useBusiness } from './BusinessContext'
import {
  TAX_GROUPS,
  categorySuggestionsFor,
  guessTaxGroup,
  taxGroupById,
  type ProductCategory,
  type TaxGroupId,
} from '@/lib/tax-categories'
import { removeProductCategories, saveProductCategories } from '@/server/business.functions'

type Picked = { name: string; group: TaxGroupId }

const key = (v: string) => v.trim().toLowerCase()

/**
 * Pop-up that sets up the business's product categories. It suggests what
 * most businesses of this type track, grouped by the tax line each rolls up
 * to, and lets staff add their own specifics. Only picked categories appear as
 * one-tap chips on the product form.
 */
export function CategorySetupSheet({
  open,
  onClose,
  productCategories = [],
  onSaved,
}: {
  open: boolean
  onClose: () => void
  /** Category text already used on products, offered so nothing gets lost. */
  productCategories?: string[]
  onSaved?: (added: string[]) => void
}) {
  const toast = useToast()
  const { type, categories, onCategories } = useBusiness()
  const suggestions = useMemo(() => categorySuggestionsFor(type.id), [type])
  const [picked, setPicked] = useState<Map<string, Picked>>(new Map())
  const [custom, setCustom] = useState('')
  const [customGroup, setCustomGroup] = useState<TaxGroupId>(TAX_GROUPS[1]!.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPicked(new Map(categories.map((c) => [key(c.name), { name: c.name, group: c.taxGroup }])))
    setCustom('')
    setError('')
  }, [open, categories])

  const onProducts = useMemo(() => {
    const known = new Set([...suggestions.map((s) => key(s.name)), ...categories.map((c) => key(c.name))])
    const seen = new Set<string>()
    return productCategories.filter((c) => {
      const k = key(c)
      if (!k || known.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [productCategories, suggestions, categories])

  /** Every chip to show under each tax group: suggestions, then saved and custom picks filed there. */
  const byGroup = useMemo(() => {
    const groups = new Map<TaxGroupId, string[]>()
    const add = (group: TaxGroupId, name: string) => {
      const list = groups.get(group) ?? []
      if (!list.some((n) => key(n) === key(name))) list.push(name)
      groups.set(group, list)
    }
    for (const s of suggestions) add(picked.get(key(s.name))?.group ?? s.group, s.name)
    for (const p of picked.values()) if (!onProducts.some((c) => key(c) === key(p.name))) add(p.group, p.name)
    return TAX_GROUPS.filter((g) => groups.has(g.id)).map((g) => ({ group: g, names: groups.get(g.id)! }))
  }, [suggestions, picked, onProducts])

  function toggle(name: string, group: TaxGroupId) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(key(name))) next.delete(key(name))
      else next.set(key(name), { name, group })
      return next
    })
  }

  function pickAll(names: string[], group: TaxGroupId) {
    setPicked((prev) => {
      const next = new Map(prev)
      const allOn = names.every((n) => next.has(key(n)))
      for (const n of names) {
        if (allOn) next.delete(key(n))
        else if (!next.has(key(n))) next.set(key(n), { name: n, group })
      }
      return next
    })
  }

  function addCustom(e?: React.FormEvent) {
    e?.preventDefault()
    // The sheet can open over the product form; keep this submit from reaching it through the portal.
    e?.stopPropagation()
    const name = custom.trim().slice(0, 60)
    if (!name) return
    setPicked((prev) => new Map(prev).set(key(name), { name, group: customGroup }))
    setCustom('')
  }

  const savedKeys = new Set(categories.map((c) => key(c.name)))
  const additions = Array.from(picked.values()).filter((p) => !savedKeys.has(key(p.name)))
  const refiled = categories.filter((c) => {
    const p = picked.get(key(c.name))
    return p && p.group !== c.taxGroup
  })
  const removals = categories.filter((c) => !picked.has(key(c.name)))
  const changes = additions.length + refiled.length + removals.length

  async function save() {
    setSaving(true)
    setError('')
    try {
      let next: ProductCategory[] = categories
      const upserts = [
        ...additions.map((p) => ({ name: p.name, taxGroup: p.group })),
        ...refiled.map((c) => ({ name: c.name, taxGroup: picked.get(key(c.name))!.group })),
      ]
      if (upserts.length) next = (await saveProductCategories({ data: { items: upserts } })) as ProductCategory[]
      if (removals.length) next = (await removeProductCategories({ data: { ids: removals.map((c) => c.id) } })) as ProductCategory[]
      onCategories(next)
      toast(
        additions.length
          ? `Added ${additions.length} categor${additions.length === 1 ? 'y' : 'ies'}`
          : 'Categories updated',
      )
      onSaved?.(additions.map((a) => a.name))
      onClose()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={`Categories for your ${type.label.toLowerCase()}`}
      subtitle={
        <>
          Tap the ones you use. Each is filed under the tax line your accountant books it to, so your reports are ready
          at tax time. Only the ones you pick show up as quick choices.
        </>
      }
    >
      {onProducts.length > 0 && (
        <section className="rounded-2xl border border-line p-3.5 mb-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="m-0 text-[15px] font-bold">Already on your products</h3>
            <button type="button" className="btn btn-text btn-sm !py-1" onClick={() => onProducts.forEach((c) => !picked.has(key(c)) && toggle(c, guessTaxGroup(c, suggestions)))}>
              Add all
            </button>
          </div>
          <p className="m-0 mb-2.5 text-[13px] text-ink-2">Keep what you’ve been using. Bintro files each one under its likely tax group.</p>
          <div className="flex flex-wrap gap-1.5">
            {onProducts.map((c) => {
              const on = picked.has(key(c))
              const group = picked.get(key(c))?.group ?? guessTaxGroup(c, suggestions)
              return (
                <button key={c} type="button" className="chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1" aria-pressed={on} onClick={() => toggle(c, group)}>
                  {on && <Check size={14} />}
                  {c}
                  <span className={`font-normal ${on ? 'text-white/70' : 'text-ink-2'}`}>· {taxGroupById(group).label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {byGroup.map(({ group, names }) => {
          const onCount = names.filter((n) => picked.has(key(n))).length
          return (
            <section key={group.id} className="rounded-2xl bg-surface p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="m-0 text-[15px] font-bold flex items-center gap-2 flex-wrap">
                    {group.label}
                    {group.cogs && (
                      <span className="text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white text-ink-2">
                        COGS
                      </span>
                    )}
                  </h3>
                  <p className="m-0 text-[13px] text-ink-2">{group.why}</p>
                </div>
                <button type="button" className="btn btn-text btn-sm !py-1 shrink-0" onClick={() => pickAll(names, group.id)}>
                  {onCount === names.length ? 'Clear' : 'Pick all'}
                </button>
              </div>
              <p className="m-0 mt-1 mb-2.5 text-[12px] text-ink-2">
                <span className="font-semibold">For your accountant:</span> {group.taxLine} · QuickBooks “{group.qbAccount}”
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={group.label}>
                {names.map((n) => {
                  const on = picked.has(key(n))
                  return (
                    <button key={n} type="button" className="chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1" aria-pressed={on} onClick={() => toggle(n, group.id)}>
                      {on ? <Check size={14} /> : <Plus size={14} className="text-ink-2" />}
                      {n}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <form onSubmit={addCustom} className="rounded-2xl border border-dashed border-line p-3.5 mt-3">
        <h3 className="m-0 text-[15px] font-bold">Add something specific</h3>
        <p className="m-0 mb-2.5 text-[13px] text-ink-2">
          Get as specific as you like, e.g. “Chrome powders” or “Brazilian wax”. Pick where it’s booked.
        </p>
        <div className="grid min-[560px]:grid-cols-[1fr_auto_auto] gap-2">
          <label htmlFor="cat-custom" className="sr-only">
            Category name
          </label>
          <input
            id="cat-custom"
            className="field-input"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Category name"
            autoComplete="off"
          />
          <label htmlFor="cat-custom-group" className="sr-only">
            Tax group
          </label>
          <select
            id="cat-custom-group"
            className="field-input min-[560px]:!w-auto"
            value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value as TaxGroupId)}
          >
            {TAX_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-tonal" disabled={!custom.trim()}>
            <Plus size={18} />
            Add
          </button>
        </div>
        <p className="m-0 mt-2 text-[12px] text-ink-2">{taxGroupById(customGroup).taxLine}</p>
      </form>

      <p className="text-[12px] text-ink-2 mt-3 mb-0">
        Tax lines follow the US Schedule C and are a starting point. Your accountant has the final say.
      </p>
      {error && <p className="text-bad text-sm mt-3 mb-0">{error}</p>}

      <div className="sticky bottom-0 bg-white -mx-5 px-5 pt-1 pb-0.5">
        <SheetActions>
          <button type="button" className="btn btn-tonal" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || changes === 0} onClick={save}>
            {saving ? 'Saving…' : changes === 0 ? `${picked.size} picked` : `Save ${picked.size} categor${picked.size === 1 ? 'y' : 'ies'}`}
          </button>
        </SheetActions>
      </div>
    </Sheet>
  )
}

/** Settings → Categories: the business's list grouped by tax line, with re-filing and removal. */
export function CategoryManager({ productCategories }: { productCategories: string[] }) {
  const toast = useToast()
  const { type, categories, onCategories } = useBusiness()
  const [setupOpen, setSetupOpen] = useState(false)

  const usage = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of productCategories) m.set(key(c), (m.get(key(c)) ?? 0) + 1)
    return m
  }, [productCategories])

  const grouped = TAX_GROUPS.map((g) => ({ group: g, items: categories.filter((c) => c.taxGroup === g.id) })).filter(
    (g) => g.items.length > 0,
  )

  async function refile(c: ProductCategory, taxGroup: TaxGroupId) {
    try {
      onCategories((await saveProductCategories({ data: { items: [{ name: c.name, taxGroup }] } })) as ProductCategory[])
      toast(`${c.name} moved to ${taxGroupById(taxGroup).label}`)
    } catch {
      toast('Could not update. Try again.')
    }
  }

  async function remove(c: ProductCategory) {
    try {
      onCategories((await removeProductCategories({ data: { ids: [c.id] } })) as ProductCategory[])
      toast(`${c.name} removed`, async () => {
        onCategories((await saveProductCategories({ data: { items: [{ name: c.name, taxGroup: c.taxGroup }] } })) as ProductCategory[])
      })
    } catch {
      toast('Could not remove. Try again.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap bg-action-tint rounded-2xl p-4 mb-4">
        <div className="min-w-0 text-sm">
          <b className="block text-[15px]">Suggestions for a {type.label.toLowerCase()}</b>
          <span className="text-ink-2">Pick from what most shops like yours track, or add your own.</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setSetupOpen(true)}>
          <Sparkles size={16} />
          {categories.length ? 'Add more' : 'Set up categories'}
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="text-ink-2 bg-surface rounded-2xl px-4 py-5 text-center m-0">
          No categories yet. Set them up once and they appear as one-tap choices when adding products.
        </p>
      ) : (
        <div className="grid gap-3">
          {grouped.map(({ group, items }) => (
            <section key={group.id} className="bg-surface rounded-2xl px-4 pt-3 pb-1">
              <h3 className="m-0 text-[15px] font-bold">{group.label}</h3>
              <p className="m-0 text-[12px] text-ink-2 mb-1">
                {group.taxLine} · QuickBooks “{group.qbAccount}”
              </p>
              <ul className="list-none m-0 p-0">
                {items.map((c) => {
                  const n = usage.get(key(c.name)) ?? 0
                  return (
                    <li key={c.id} className="flex items-center gap-2 py-2 border-b border-line last:border-b-0">
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block truncate">{c.name}</span>
                        <span className="text-[12px] text-ink-2">
                          {n ? `${n} product${n === 1 ? '' : 's'}` : 'Not used yet'}
                        </span>
                      </span>
                      <label className="sr-only" htmlFor={`cat-group-${c.id}`}>
                        Tax group for {c.name}
                      </label>
                      <select
                        id={`cat-group-${c.id}`}
                        className="chip !py-1.5 !text-[13px] max-w-[46%]"
                        value={c.taxGroup}
                        onChange={(e) => refile(c, e.target.value as TaxGroupId)}
                      >
                        {TAX_GROUPS.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="w-9 h-9 rounded-full border-0 bg-transparent grid place-items-center text-bad cursor-pointer hover:bg-white shrink-0"
                        onClick={() => remove(c)}
                        aria-label={`Remove ${c.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-ink-2 text-[13px] mt-3 mb-0">
        Removing a category from the list doesn’t change products already filed under it.
      </p>

      <CategorySetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} productCategories={productCategories} />
    </div>
  )
}
