import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Copy, ExternalLink, Globe, Lock, Plus, Sparkles, Tags, Wand2, X } from 'lucide-react'
import type { Product } from './types'
import { lookupBarcodeDetails, readLabelPhoto } from '@/server/inventory.functions'
import { saveProductCategories, suggestProduct } from '@/server/business.functions'
import { checkWebPrice, confirmPrices } from '@/server/insights.functions'
import { PRICE_STALE_DAYS, WEB_PRICE_SOURCE_LABELS, daysBetween, type WebPriceResult } from '@/lib/insights'
import { DEFAULT_REORDER_THRESHOLD } from '@/lib/inventory-defaults'
import { shrinkImage } from '@/lib/images'
import { bestSimilarEntry, predictPrices } from '@/lib/entry-predictions'
import { Field, SheetActions } from '@/components/ui/Sheet'
import { AutoInput, QuickChips } from '@/components/ui/AutoInput'
import { PriceInput } from '@/components/ui/PriceInput'
import { Thumb, centsToDollars } from '@/components/ui/bits'
import { useBusiness } from '@/components/business/BusinessContext'
import { CategorySetupSheet } from '@/components/business/CategorySetupSheet'
import { categorySuggestionsFor, findCategory, guessTaxGroup, taxGroupById, type ProductCategory } from '@/lib/tax-categories'
import { COPY_PROMPT_OFF_KEY, CopyPreviousSheet } from './CopyPreviousSheet'

export type ProductFormValues = {
  barcode: string
  name: string
  brand: string
  vendor: string
  category: string
  size: string
  qty: number
  reorderThreshold: number
  unitCostCents: number
  retailPriceCents: number
  imageUrl: string
  extraBarcodes: string[]
}

type PriceState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; note: string }
  | { kind: 'error'; message: string }

type WebPriceState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; result: WebPriceResult } | { kind: 'confirmed' }

type Prefill = { kind: 'none' } | { kind: 'loading' } | { kind: 'found'; note: string } | { kind: 'miss' }

/**
 * Add / edit form shown in a bottom sheet. For a new barcode it looks the code up
 * in public product databases, and any product can be filled in from a label photo.
 * Every field predicts from what the business already stocks, and AI estimates the
 * cost and retail price (automatically for new products once there's a name).
 * Prices drop down predictions from earlier entries, and new products offer to
 * copy a previous entry that looks alike so only the name and barcode are left.
 */
export function ProductForm({
  product,
  initialBarcode = '',
  barcodeLocked = false,
  autoLookup = false,
  products,
  saveLabel,
  qtyLabel = 'On hand',
  onCancel,
  onSave,
  onDelete,
}: {
  product?: Product
  initialBarcode?: string
  barcodeLocked?: boolean
  autoLookup?: boolean
  products: Product[]
  saveLabel: string
  qtyLabel?: string
  onCancel: () => void
  onSave: (values: ProductFormValues) => Promise<void>
  /** Shown between Cancel and Save when set. The first tap arms it, the second deletes. */
  onDelete?: () => Promise<void>
}) {
  const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode)
  const [extraBarcodes, setExtraBarcodes] = useState<string[]>(product?.extraBarcodes ?? [])
  const [extraDraft, setExtraDraft] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)
  const [name, setName] = useState(product?.name ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [vendor, setVendor] = useState(product?.vendor ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [size, setSize] = useState(product?.size ?? '')
  const [qty, setQty] = useState(String(product?.qty ?? 0))
  const [par, setPar] = useState(String(product?.reorderThreshold ?? DEFAULT_REORDER_THRESHOLD))
  const [cost, setCost] = useState(product?.unitCostCents ? centsToDollars(product.unitCostCents) : '')
  const [retail, setRetail] = useState(product?.retailPriceCents ? centsToDollars(product.retailPriceCents) : '')
  const [price, setPrice] = useState<PriceState>({ kind: 'idle' })
  const [webPrice, setWebPrice] = useState<WebPriceState>({ kind: 'idle' })
  const priceDaysOld = product ? daysBetween(product.priceUpdatedAt ?? product.createdAt) : 0
  const priceStale = Boolean(product) && (priceDaysOld >= PRICE_STALE_DAYS || !product?.unitCostCents)
  const autoPriced = useRef(Boolean(product))
  const { type, categories: savedCategories, onCategories, can } = useBusiness()
  // Label photos and price checks are AI features that come with Plus.
  const aiOn = can('ai')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const offeredCategories = useRef(false)
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [prefill, setPrefill] = useState<Prefill>({ kind: 'none' })
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const retailRef = useRef<HTMLInputElement>(null)
  const others = useMemo(() => products.filter((p) => p.id !== product?.id), [products, product])
  const canCopy = !product && others.length > 0
  const [copyOpen, setCopyOpen] = useState(false)
  const [copiedFrom, setCopiedFrom] = useState<Product | null>(null)
  const [similarDismissed, setSimilarDismissed] = useState(false)
  const offeredCopy = useRef(false)

  const brands = useMemo(() => uniq(products.map((p) => p.brand)), [products])
  const vendors = useMemo(() => uniq(products.map((p) => p.vendor)), [products])
  const categories = useMemo(
    () => uniq([...savedCategories.map((c) => c.name), ...products.map((p) => p.category)]),
    [products, savedCategories],
  )
  const sizes = useMemo(() => uniq([...products.map((p) => p.size), ...type.sizes]), [products, type])
  /** Names from the chosen brand first, so a new shade of a known line is two taps away. */
  const names = useMemo(() => {
    const b = brand.trim().toLowerCase()
    const sameBrand = b ? products.filter((p) => p.brand.toLowerCase() === b) : []
    return uniq([...sameBrand.map((p) => p.name), ...products.map((p) => p.name)])
  }, [products, brand])
  const context = useMemo(() => ({ name, brand, category, size, vendor }), [name, brand, category, size, vendor])
  const costOptions = useMemo(
    () =>
      predictPrices(others, 'unitCostCents', {
        ...context,
        otherCents: Math.round((Number(retail) || 0) * 100),
      }),
    [others, context, retail],
  )
  const retailOptions = useMemo(
    () =>
      predictPrices(others, 'retailPriceCents', {
        ...context,
        otherCents: Math.round((Number(cost) || 0) * 100),
      }),
    [others, context, cost],
  )
  /** A previous entry that looks like this one, offered inline while details are still blank. */
  const similar = useMemo(() => {
    if (!canCopy || copiedFrom || similarDismissed || (category && cost)) return null
    const match = bestSimilarEntry(others, { name, brand })
    return match && match.name.toLowerCase() !== name.trim().toLowerCase() ? match : null
  }, [canCopy, copiedFrom, similarDismissed, others, name, brand, category, cost])
  /** Only categories the business added, most used first. */
  const quickCategories = useMemo(() => {
    const used = new Map<string, number>()
    for (const p of products) if (p.category) used.set(p.category.toLowerCase(), (used.get(p.category.toLowerCase()) ?? 0) + 1)
    return [...savedCategories]
      .sort((a, b) => (used.get(b.name.toLowerCase()) ?? 0) - (used.get(a.name.toLowerCase()) ?? 0) || a.name.localeCompare(b.name))
      .map((c) => c.name)
  }, [products, savedCategories])
  const savedCategory = findCategory(savedCategories, category)
  const productCategoryNames = useMemo(() => products.map((p) => p.category), [products])

  /** The set-up pop-up opens by itself the first time staff reach Category with an empty list. */
  function maybeOfferCategories() {
    if (offeredCategories.current || savedCategories.length > 0) return
    offeredCategories.current = true
    setCategoryOpen(true)
  }

  async function saveTypedCategory() {
    const name = category.trim()
    if (!name) return
    const taxGroup = guessTaxGroup(name, categorySuggestionsFor(type.id), savedCategories)
    try {
      onCategories((await saveProductCategories({ data: { items: [{ name, taxGroup }] } })) as ProductCategory[])
    } catch {
      setError('Could not add that category. Try again.')
    }
  }

  /** Staff usually buy a brand from the same distributor, so reuse it. */
  function vendorFor(b: string) {
    const match = products.find((p) => p.vendor && p.brand.toLowerCase() === b.trim().toLowerCase())
    return match?.vendor ?? ''
  }

  /** Picking an existing product's name copies its details into the blanks (e.g. a new shade's barcode). */
  function copyFromExisting(pickedName: string) {
    const match = products.find((p) => p.name.toLowerCase() === pickedName.toLowerCase() && p.id !== product?.id)
    if (!match) return
    setBrand((v) => v || match.brand)
    setCategory((v) => v || match.category)
    setSize((v) => v || match.size)
    setVendor((v) => v || match.vendor)
    setPar((v) => (product ? v : String(match.reorderThreshold)))
    setCost((v) => v || (match.unitCostCents ? centsToDollars(match.unitCostCents) : ''))
    setRetail((v) => v || (match.retailPriceCents ? centsToDollars(match.retailPriceCents) : ''))
    if (match.unitCostCents || match.retailPriceCents) autoPriced.current = true
    if (!product) setCopiedFrom(match)
  }

  /** Copies a previous entry's details (a deliberate pick, so it overwrites). Name and barcode stay. */
  function copyEntry(match: Product) {
    setBrand(match.brand)
    setCategory(match.category)
    setSize(match.size)
    setVendor(match.vendor)
    setPar(String(match.reorderThreshold))
    setCost(match.unitCostCents ? centsToDollars(match.unitCostCents) : '')
    setRetail(match.retailPriceCents ? centsToDollars(match.retailPriceCents) : '')
    autoPriced.current = true
    if (match.unitCostCents || match.retailPriceCents) {
      setPrice({ kind: 'done', note: `Prices copied from ${match.name}.` })
    }
    setCopiedFrom(match)
    setCopyOpen(false)
    if (!name.trim()) setTimeout(() => nameRef.current?.querySelector('input')?.focus(), 250)
  }

  /** Pops the copy prompt up once per new product, unless staff turned it off. */
  function offerCopy() {
    if (!canCopy || offeredCopy.current) return
    offeredCopy.current = true
    try {
      if (localStorage.getItem(COPY_PROMPT_OFF_KEY) === '1') return
    } catch {
      // No storage: still ask.
    }
    // A beat after the form appears, so it's clear what the pop-up is filling in.
    setTimeout(() => setCopyOpen(true), 250)
  }

  /**
   * AI price detection. Fills cost and retail price from typical US pricing and
   * tidies up any blank details. `force` is a deliberate tap, which overwrites prices.
   */
  async function estimatePrice(force: boolean, fields = { brand, name, size, category, vendor }) {
    if (!fields.name.trim() && !fields.brand.trim()) {
      if (force) setPrice({ kind: 'error', message: 'Type a product name first.' })
      return
    }
    autoPriced.current = true
    setPrice({ kind: 'loading' })
    try {
      const r = await suggestProduct({ data: fields })
      if (!r.ok) {
        setPrice({ kind: 'error', message: r.message })
        return
      }
      setBrand((v) => v || r.brand)
      setSize((v) => v || r.size)
      setCategory((v) => v || r.category)
      if (r.unitCostCents) setCost((v) => (force || !v ? centsToDollars(r.unitCostCents) : v))
      if (r.retailPriceCents) setRetail((v) => (force || !v ? centsToDollars(r.retailPriceCents) : v))
      setPrice({
        kind: 'done',
        note: r.unitCostCents || r.retailPriceCents ? r.note || 'AI estimate. Adjust to your invoice.' : 'No confident price for this one. Enter it from your invoice.',
      })
    } catch {
      setPrice({ kind: 'error', message: 'Price estimate failed. Check your connection.' })
    }
  }

  /**
   * Real listed prices from the manufacturer, an authorised distributor or Amazon
   * (third-party resale listings are skipped). Fills the fields; Save keeps them.
   */
  async function findWebPrice() {
    if (!name.trim()) {
      setWebPrice({ kind: 'done', result: { ok: false, message: 'Type a product name first.' } })
      return
    }
    setWebPrice({ kind: 'loading' })
    try {
      const result = await checkWebPrice({
        data: { productId: product?.id, name, brand, size, category, vendor, barcode },
      })
      if (result.ok) {
        if (result.unitCostCents) setCost(centsToDollars(result.unitCostCents))
        if (result.retailPriceCents) setRetail(centsToDollars(result.retailPriceCents))
      }
      setWebPrice({ kind: 'done', result })
    } catch {
      setWebPrice({ kind: 'done', result: { ok: false, message: "Couldn't reach the price search. Try again in a minute." } })
    }
  }

  async function keepPrices() {
    if (!product) return
    try {
      await confirmPrices({ data: { productId: product.id } })
      setWebPrice({ kind: 'confirmed' })
    } catch {
      setWebPrice({ kind: 'done', result: { ok: false, message: "Couldn't save that. Try again." } })
    }
  }

  /** New products get a price estimate once, as soon as there's something to go on. */
  function maybeAutoPrice(fields?: { brand: string; name: string; size: string; category: string; vendor: string }) {
    if (autoPriced.current || cost || retail) return
    const f = fields ?? { brand, name, size, category, vendor }
    if (f.name.trim().length < 3) return
    if (aiOn) estimatePrice(false, f)
  }

  function applyDetails(d: { brand: string; name: string; size: string; category: string; imageUrl?: string }) {
    setBrand((v) => v || d.brand)
    setName((v) => v || d.name)
    setSize((v) => v || d.size)
    setCategory((v) => v || d.category)
    if (d.imageUrl) setImageUrl((v) => v || d.imageUrl!)
    setVendor((v) => v || vendorFor(d.brand))
  }

  async function runLookup(code: string) {
    if (!code.trim()) return
    setPrefill({ kind: 'loading' })
    try {
      const r = await lookupBarcodeDetails({ data: { barcode: code } })
      if (r.found) {
        applyDetails(r)
        setPrefill({ kind: 'found', note: `Found in ${r.source}. Check the details, then save.` })
        maybeAutoPrice({
          brand: brand || r.brand,
          name: name || r.name,
          size: size || r.size,
          category: category || r.category,
          vendor,
        })
      } else {
        setPrefill({ kind: 'miss' })
      }
    } catch {
      setPrefill({ kind: 'miss' })
    }
    offerCopy()
  }

  useEffect(() => {
    // A scanned barcode is looked up first, so the copy prompt can rank entries by what was found.
    if (autoLookup) runLookup(barcode)
    else offerCopy()
    // Only on open: the lookup is for the barcode that was just scanned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onLabelFile(file: File) {
    setReading(true)
    setError('')
    try {
      const image = await shrinkImage(file)
      const r = await readLabelPhoto({ data: { image, mediaType: 'image/jpeg' } })
      if (!r.ok) {
        setError(r.message)
        return
      }
      // A photo is deliberate, so it overrides what's typed rather than filling gaps.
      if (r.brand) setBrand(r.brand)
      if (r.name) setName(r.name)
      if (r.size) setSize(r.size)
      if (r.category) setCategory((v) => v || r.category)
      setVendor((v) => v || vendorFor(r.brand))
      setPrefill({ kind: 'found', note: 'Read from your photo. Check it before saving.' })
      maybeAutoPrice({
        brand: r.brand || brand,
        name: r.name || name,
        size: r.size || size,
        category: category || r.category,
        vendor,
      })
    } catch {
      setError('That photo could not be opened. Try another one.')
    } finally {
      setReading(false)
    }
  }

  /** Saved extras plus whatever is still typed in the add box, so Save doesn't drop it. */
  function pendingExtras() {
    const draft = extraDraft.trim()
    return draft && !extraBarcodes.includes(draft) ? [...extraBarcodes, draft] : extraBarcodes
  }

  function addExtra() {
    const code = extraDraft.trim()
    if (!code) return
    if (code === barcode.trim() || extraBarcodes.includes(code)) {
      setError('This product already scans with that code.')
      return
    }
    const owner = products.find((p) => p.id !== product?.id && (p.barcode === code || p.extraBarcodes?.includes(code)))
    if (owner) {
      setError(`That code already belongs to ${owner.name}.`)
      return
    }
    setError('')
    setExtraBarcodes([...extraBarcodes, code])
    setExtraDraft('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Add a product name to save.')
      return
    }
    if (!barcode.trim()) {
      setError('Add a barcode to save.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        barcode: barcode.trim(),
        name: name.trim(),
        brand: brand.trim(),
        vendor: vendor.trim(),
        category: category.trim(),
        size: size.trim(),
        qty: Math.trunc(Number(qty) || 0),
        reorderThreshold: Math.max(0, Math.trunc(Number(par) || 0)),
        unitCostCents: Math.max(0, Math.round((Number(cost) || 0) * 100)),
        retailPriceCents: Math.max(0, Math.round((Number(retail) || 0) * 100)),
        imageUrl,
        extraBarcodes: pendingExtras().filter((c) => c !== barcode.trim()),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        /unique|duplicate/i.test(message)
          ? 'Another product already uses that barcode.'
          : 'Could not save. Check your connection and try again.',
      )
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {prefill.kind === 'loading' && (
        <div className="flex gap-3 items-center bg-surface rounded-2xl p-3 mb-4">
          <Thumb label="" size="lg" />
          <div className="flex-1">
            <div className="skel w-[70%]" />
            <div className="skel w-[45%]" />
          </div>
        </div>
      )}
      {prefill.kind === 'found' && (
        <div className="flex gap-3 items-center bg-surface rounded-2xl p-3 mb-4">
          <Thumb imageUrl={imageUrl} label={brand || name} size="lg" />
          <div className="min-w-0 text-sm">
            <b className="block truncate">{name || 'Product'}</b>
            <p className="m-0 text-ink-2 truncate">{[brand, size].filter(Boolean).join(', ')}</p>
            <p className="m-0 text-ink-2">{prefill.note}</p>
          </div>
        </div>
      )}
      {prefill.kind === 'miss' && (
        <div className="bg-warn-tint rounded-2xl p-3 mb-4 text-sm">
          <b>No match in the barcode databases.</b> Snap the front label and Bintro fills this in for you.
        </div>
      )}

      <div className={`grid gap-2 mb-4 ${canCopy ? 'grid-cols-2' : ''}`}>
        <button
          type="button"
          className="btn btn-tonal !px-3"
          disabled={reading || !aiOn}
          title={aiOn ? undefined : 'AI label reading comes with Bintro Plus'}
          onClick={() => {
            if (fileRef.current) fileRef.current.value = ''
            fileRef.current?.click()
          }}
        >
          {aiOn ? <Camera size={18} /> : <Lock size={16} />}
          {reading ? 'Reading…' : canCopy ? 'Label photo' : 'Fill in from a label photo'}
          {!aiOn && <span className="text-[11px] font-bold text-gold-ink">Plus</span>}
        </button>
        {canCopy && (
          <button type="button" className="btn btn-tonal !px-3" onClick={() => setCopyOpen(true)}>
            <Copy size={18} />
            Copy previous
          </button>
        )}
      </div>

      {copiedFrom && (
        <div className="flex gap-3 items-center bg-good-tint rounded-2xl p-3 mb-4">
          <Thumb imageUrl={copiedFrom.imageUrl} label={copiedFrom.brand || copiedFrom.name} />
          <div className="flex-1 min-w-0 text-sm">
            <b className="block truncate">Copied from {copiedFrom.name}</b>
            <p className="m-0 text-ink-2">Change anything that’s different, then save.</p>
          </div>
          <button type="button" className="btn btn-text btn-sm shrink-0" onClick={() => setCopyOpen(true)}>
            Change
          </button>
        </div>
      )}

      {similar && (
        <div className="flex gap-3 items-center bg-action-tint rounded-2xl p-3 mb-4">
          <Thumb imageUrl={similar.imageUrl} label={similar.brand || similar.name} />
          <div className="flex-1 min-w-0 text-sm">
            <b className="block">Looks like {similar.name}</b>
            <p className="m-0 text-ink-2 truncate">
              Copy its {[similar.category, similar.size, similar.unitCostCents ? 'prices' : ''].filter(Boolean).join(', ') || 'details'}?
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => copyEntry(similar)}>
            Copy
          </button>
          <button
            type="button"
            aria-label="No thanks"
            className="w-9 h-9 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-white shrink-0"
            onClick={() => setSimilarDismissed(true)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onLabelFile(file)
        }}
      />

      <Field label="Product name" htmlFor="pf-name">
        <div ref={nameRef}>
          <AutoInput
            id="pf-name"
            value={name}
            onChange={setName}
            onPick={copyFromExisting}
            suggestions={names}
            placeholder={copiedFrom ? `e.g. ${copiedFrom.name}` : 'Start typing — Bintro suggests as you go'}
            onBlur={() => setTimeout(() => maybeAutoPrice(), 150)}
          />
        </div>
      </Field>
      <Field label="Brand" htmlFor="pf-brand">
        <AutoInput
          id="pf-brand"
          value={brand}
          onChange={setBrand}
          onPick={(b) => setVendor((v) => v || vendorFor(b))}
          suggestions={brands}
          onBlur={() => setVendor((v) => v || vendorFor(brand))}
        />
      </Field>
      <Field label="Category" htmlFor="pf-category">
        <div onFocus={maybeOfferCategories}>
          <AutoInput id="pf-category" value={category} onChange={setCategory} suggestions={categories} />
        </div>
      </Field>
      {quickCategories.length === 0 ? (
        <button
          type="button"
          className="w-full flex items-center gap-3 text-left rounded-2xl border border-dashed border-line bg-white px-3.5 py-2.5 -mt-1.5 mb-3 cursor-pointer hover:bg-surface"
          onClick={() => setCategoryOpen(true)}
        >
          <Tags size={18} className="text-action shrink-0" />
          <span className="text-[13px]">
            <b className="block text-ink">Set up categories for your {type.label.toLowerCase()}</b>
            <span className="text-ink-2">Pick from common ones, filed the way your accountant books them.</span>
          </span>
        </button>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto -mt-1.5 mb-1.5 pb-0.5" role="group" aria-label="Your categories">
          {quickCategories.map((o) => (
            <button
              key={o}
              type="button"
              className="chip !px-2.5 !py-1 !text-[13px]"
              aria-pressed={category.trim().toLowerCase() === o.toLowerCase()}
              onClick={() => setCategory(o)}
            >
              {o}
            </button>
          ))}
          <button
            type="button"
            className="chip !px-2.5 !py-1 !text-[13px] inline-flex items-center gap-1 !border-dashed !text-action"
            onClick={() => setCategoryOpen(true)}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      )}
      {category.trim() && (
        <p className="text-[12px] text-ink-2 m-0 mb-3">
          {savedCategory ? (
            <>
              Booked as <b className="text-ink">{taxGroupById(savedCategory.taxGroup).label}</b> ·{' '}
              {taxGroupById(savedCategory.taxGroup).taxLine}
            </>
          ) : (
            <>
              Not in your categories yet.{' '}
              <button type="button" className="border-0 bg-transparent p-0 text-action font-semibold cursor-pointer underline-offset-2 hover:underline" onClick={saveTypedCategory}>
                Add “{category.trim()}” as{' '}
                {taxGroupById(guessTaxGroup(category, categorySuggestionsFor(type.id), savedCategories)).label}
              </button>
            </>
          )}
        </p>
      )}
      {quickCategories.length > 0 && !category.trim() && <div className="mb-3" />}
      <Field label="Size" htmlFor="pf-size">
        <AutoInput id="pf-size" value={size} onChange={setSize} suggestions={sizes} placeholder={type.sizes[0]} />
      </Field>
      <QuickChips label="Common sizes" options={type.sizes} value={size} onPick={setSize} />
      <Field label="Buy it from" htmlFor="pf-vendor">
        <AutoInput
          id="pf-vendor"
          value={vendor}
          onChange={setVendor}
          suggestions={vendors}
          placeholder={type.vendorExample}
        />
      </Field>

      <div className="bg-surface rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="text-[13px] font-semibold text-ink-2 mr-auto">Pricing</span>
          <button
            type="button"
            className="btn btn-text btn-sm !py-1.5"
            disabled={webPrice.kind === 'loading' || !aiOn}
            onClick={findWebPrice}
            title="Manufacturer, authorized distributor or Amazon — not third-party resellers"
          >
            {aiOn ? <Globe size={16} /> : <Lock size={14} />}
            {webPrice.kind === 'loading' ? 'Searching…' : 'Find web price'}
          </button>
          <button
            type="button"
            className="btn btn-text btn-sm !py-1.5"
            disabled={price.kind === 'loading' || !aiOn}
            title={aiOn ? undefined : 'AI price checks come with Bintro Plus'}
            onClick={() => estimatePrice(true)}
          >
            {aiOn ? <Sparkles size={16} /> : <Lock size={14} />}
            {price.kind === 'loading' ? 'Estimating…' : 'AI price check'}
          </button>
        </div>
        {priceStale && webPrice.kind === 'idle' && (
          <p className="m-0 mb-2 text-[13px] rounded-xl bg-gold-tint text-gold-ink px-3 py-2">
            {product?.unitCostCents
              ? `Prices last updated ${product.priceUpdatedAt ? `${priceDaysOld} days ago` : 'a while ago'}. Check they're still right.`
              : 'No cost saved yet — add it so orders and budgets are accurate.'}
            {product?.unitCostCents ? (
              <button type="button" className="btn btn-text btn-sm !py-0 !px-1.5 !text-gold-ink underline" onClick={keepPrices}>
                Still right
              </button>
            ) : null}
          </p>
        )}
        {webPrice.kind === 'confirmed' && <p className="m-0 mb-2 text-[13px] text-good font-semibold">Prices marked as up to date.</p>}
        {webPrice.kind === 'loading' && (
          <p className="m-0 mb-2 text-[13px] text-ink-2">Checking manufacturer, distributor and Amazon listings — up to a minute.</p>
        )}
        {webPrice.kind === 'done' && !webPrice.result.ok && (
          <p className="m-0 mb-2 text-[13px] text-bad">{webPrice.result.message}</p>
        )}
        {webPrice.kind === 'done' && webPrice.result.ok && (
          <div className="mb-2 rounded-xl border border-gold/40 bg-gold-tint px-3 py-2 text-[13px]">
            <b className="text-gold-ink">
              {WEB_PRICE_SOURCE_LABELS[webPrice.result.sourceType]}
              {webPrice.result.sourceName && webPrice.result.sourceType !== 'estimate' ? ` · ${webPrice.result.sourceName}` : ''}
            </b>
            {webPrice.result.sourceUrl && (
              <a
                href={webPrice.result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-action font-medium"
              >
                View listing <ExternalLink size={12} />
              </a>
            )}
            {webPrice.result.note && <span className="block text-ink-2 mt-0.5">{webPrice.result.note}</span>}
            <span className="block text-ink-2 mt-0.5">Filled in below — adjust to your invoice, then save.</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Your cost" htmlFor="pf-cost">
            <PriceInput
              id="pf-cost"
              placeholder={price.kind === 'loading' ? '…' : '0.00'}
              value={cost}
              onChange={setCost}
              onPick={() => setTimeout(() => retailRef.current?.focus(), 0)}
              suggestions={costOptions}
            />
          </Field>
          <Field label="Sells for" htmlFor="pf-retail">
            <PriceInput
              ref={retailRef}
              id="pf-retail"
              align="right"
              placeholder={price.kind === 'loading' ? '…' : 'Not sold'}
              value={retail}
              onChange={setRetail}
              suggestions={retailOptions}
            />
          </Field>
        </div>
        <PriceNote cost={cost} retail={retail} state={price} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label={qtyLabel} htmlFor="pf-qty">
          <input
            id="pf-qty"
            className="field-input num"
            type="number"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        <Field label="Reorder at" htmlFor="pf-par">
          <input
            id="pf-par"
            className="field-input num"
            type="number"
            inputMode="numeric"
            min={0}
            value={par}
            onChange={(e) => setPar(e.target.value)}
          />
        </Field>
      </div>
      {barcodeLocked ? (
        <p className="text-ink-2 text-sm m-0">Barcode {barcode}</p>
      ) : (
        <Field label="Barcode or SKU" htmlFor="pf-barcode">
          <div className="flex gap-2">
            <input
              id="pf-barcode"
              className="field-input"
              autoComplete="off"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            {!product && barcode.trim() && (
              <button
                type="button"
                className="btn btn-tonal btn-sm shrink-0"
                disabled={prefill.kind === 'loading'}
                onClick={() => runLookup(barcode)}
              >
                Look up
              </button>
            )}
            {!barcode.trim() && (
              <button
                type="button"
                className="btn btn-tonal btn-sm shrink-0"
                onClick={() => setBarcode(makeSku(products))}
                title="For items without a barcode, like house-made or loose stock"
              >
                <Wand2 size={16} />
                Make one
              </button>
            )}
          </div>
        </Field>
      )}
      {product && (
        <div className="mt-3">
          {extraBarcodes.length > 0 && (
            <div className="mb-2">
              <p className="text-ink-2 text-[13px] font-semibold m-0 mb-1.5">Also scans as</p>
              <div className="flex flex-wrap gap-2">
                {extraBarcodes.map((code) => (
                  <span key={code} className="chip">
                    {code}
                    <button
                      type="button"
                      className="-mr-1 p-0.5 text-ink-2"
                      aria-label={`Remove ${code}`}
                      onClick={() => setExtraBarcodes(extraBarcodes.filter((c) => c !== code))}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {extraOpen ? (
            <Field label="Additional barcode or SKU" htmlFor="pf-extra-barcode">
              <div className="flex gap-2">
                <input
                  id="pf-extra-barcode"
                  className="field-input"
                  autoComplete="off"
                  autoFocus
                  placeholder="Scan with a wand or type it"
                  value={extraDraft}
                  onChange={(e) => setExtraDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Hardware scanners end with Enter; add the code instead of submitting the form.
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addExtra()
                    }
                  }}
                />
                {extraDraft.trim() ? (
                  <button type="button" className="btn btn-tonal btn-sm shrink-0" onClick={addExtra}>
                    Add
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-tonal btn-sm shrink-0"
                    onClick={() => setExtraDraft(makeSku(products))}
                    title="Make an internal code, e.g. for a refill or bundle"
                  >
                    <Wand2 size={16} />
                    Make one
                  </button>
                )}
              </div>
            </Field>
          ) : (
            <button type="button" className="btn btn-text btn-sm" onClick={() => setExtraOpen(true)}>
              <Plus size={16} />
              Add another SKU
            </button>
          )}
        </div>
      )}

      {error && <p className="text-bad text-sm mt-3 mb-0">{error}</p>}
      {confirmDelete && !deleting && (
        <p className="text-bad text-sm mt-3 mb-0">
          Deleting removes {product?.name || 'this product'} and its scan history for good. Tap again to confirm.
        </p>
      )}

      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            className={`btn ${confirmDelete ? 'bg-bad text-white' : 'bg-bad-tint text-bad'}`}
            disabled={saving || deleting}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              setDeleting(true)
              setError('')
              try {
                await onDelete()
              } catch {
                setError('Could not delete this product. Try again.')
                setDeleting(false)
                setConfirmDelete(false)
              }
            }}
            onBlur={() => !deleting && setConfirmDelete(false)}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap to confirm' : 'Delete'}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
          {saving ? 'Saving…' : saveLabel}
        </button>
      </SheetActions>

      <CategorySetupSheet
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        productCategories={productCategoryNames}
        onSaved={(added) => {
          if (!category.trim() && added.length === 1) setCategory(added[0]!)
        }}
      />

      {canCopy && (
        <CopyPreviousSheet
          open={copyOpen}
          products={others}
          context={context}
          onPick={copyEntry}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </form>
  )
}

function uniq(values: string[]) {
  const seen = new Map<string, string>()
  for (const v of values) {
    const t = v.trim()
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t)
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
}

/** Short internal code for items that don't carry a barcode. */
function makeSku(products: Product[]) {
  const taken = new Set(products.flatMap((p) => [p.barcode, ...(p.extraBarcodes ?? [])]))
  let code = ''
  do {
    code = `BT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  } while (taken.has(code))
  return code
}

function PriceNote({ cost, retail, state }: { cost: string; retail: string; state: PriceState }) {
  const c = Number(cost) || 0
  const r = Number(retail) || 0
  const margin = c > 0 && r > c ? Math.round(((r - c) / r) * 100) : null
  return (
    <div className="text-[13px] text-ink-2 min-h-[18px]">
      {margin !== null && (
        <span className="font-semibold text-good">
          {margin}% margin · ${(r - c).toFixed(2)} profit each.{' '}
        </span>
      )}
      {state.kind === 'loading' && <span>Checking typical prices…</span>}
      {state.kind === 'done' && <span>{state.note}</span>}
      {state.kind === 'error' && <span className="text-bad">{state.message}</span>}
    </div>
  )
}
