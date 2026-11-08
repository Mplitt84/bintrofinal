import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Camera, Check, RotateCcw } from 'lucide-react'
import type { Product } from './types'
import { createProduct, readStockPhotoFn, recordProductMovement } from '@/server/inventory.functions'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { Thumb } from '@/components/ui/bits'
import { shrinkImage } from '@/lib/images'
import { checkUnknownScan } from '@/lib/barcodes'
import { ProductForm, makeSku } from './ProductForm'

type Mode = 'in' | 'out'

type Read = {
  captured: 'sku' | 'label'
  barcode: string
  brand: string
  name: string
  size: string
  category: string
  product: Product | null
  candidates: Product[]
}

type Stage =
  | { kind: 'reading' }
  | { kind: 'retake'; message: string }
  | { kind: 'pick'; read: Read }
  | { kind: 'new'; read: Read }

const PHOTO_READER_ID = 'bintro-photo-reader'

/**
 * Reads a barcode straight off the photo on the phone (fast, no AI). Uses the
 * browser's barcode detector when it has one, else the html5-qrcode decoder.
 */
async function decodeOnDevice(file: File): Promise<string> {
  try {
    const Detector = (window as unknown as { BarcodeDetector?: new () => { detect: (img: ImageBitmap) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector
    if (Detector) {
      const bitmap = await createImageBitmap(file)
      const found = await new Detector().detect(bitmap)
      const value = found.find((f) => f.rawValue?.trim())?.rawValue?.trim()
      if (value) return value
    }
  } catch {
    // Fall through to the library decoder.
  }
  try {
    const lib = await import('html5-qrcode')
    const reader = new lib.Html5Qrcode(PHOTO_READER_ID, { verbose: false })
    try {
      return (await reader.scanFile(file, false)).trim()
    } finally {
      try {
        reader.clear()
      } catch {
        // Nothing to clear.
      }
    }
  } catch {
    return ''
  }
}

/**
 * Quick stock photo for staff in a hurry: snap the SKU / barcode or the full front
 * label, pick Add to inventory or Scan out, confirm the product and it's logged.
 * A photo that shows neither the whole code nor the whole label must be retaken.
 */
export function PhotoStockSheet({
  file,
  initialMode,
  staffName,
  products,
  onRetake,
  onClose,
  onLogged,
}: {
  file: File | null
  initialMode: Mode
  staffName: string
  products: Product[]
  /** Opens the camera again for a new photo. */
  onRetake: () => void
  onClose: () => void
  onLogged: (product: Product, movementId: number, mode: Mode, qty: number) => void | Promise<void>
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'reading' })
  const [preview, setPreview] = useState('')
  const [mode, setMode] = useState<Mode>(initialMode)
  const [qty, setQty] = useState(1)
  const [picked, setPicked] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStage({ kind: 'reading' })
    setMode(initialMode)
    setQty(1)
    setPicked(null)
    setError('')

    ;(async () => {
      try {
        const [image, onDevice] = await Promise.all([shrinkImage(file), decodeOnDevice(file)])
        // A code the phone decoded is trusted unless it looks like a partial read.
        const known = products.flatMap((p) => [p.barcode, ...(p.extraBarcodes ?? [])])
        const deviceBarcode = onDevice && (known.includes(onDevice) || checkUnknownScan(onDevice, known).ok) ? onDevice : undefined
        const r = await readStockPhotoFn({ data: { image, mediaType: 'image/jpeg', deviceBarcode } })
        if (cancelled) return
        if (!r.ok) {
          setStage({ kind: 'retake', message: r.message })
          return
        }
        const read = r as unknown as Read
        setPicked(read.product?.id ?? (read.candidates.length === 1 ? read.candidates[0].id : null))
        setStage({ kind: 'pick', read })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : ''
        setStage({
          kind: 'retake',
          message: /plan|upgrade|feature/i.test(message)
            ? 'Snap & log is on the Plus plan. A clear photo of the barcode still works when the phone can read it.'
            : "Couldn't read that photo. Check your connection and try again.",
        })
      }
    })()

    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
    // Only a new photo restarts the read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  async function log(productId: number, captured: 'sku' | 'label') {
    setSaving(true)
    setError('')
    try {
      const { product, movement } = await recordProductMovement({
        data: { productId, type: mode, qty, staffName, captured },
      })
      await onLogged(product as Product, movement.id, mode, qty)
    } catch {
      setError("Couldn't log that. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const read = stage.kind === 'pick' || stage.kind === 'new' ? stage.read : null
  const options = read ? (read.product ? [read.product] : read.candidates) : []
  const label = read ? [read.brand, read.name, read.size].filter(Boolean).join(' · ') : ''

  return (
    <Sheet
      open={file !== null}
      onClose={onClose}
      title={stage.kind === 'new' ? 'Add as a new product' : 'Log from photo'}
      subtitle={stage.kind === 'new' ? 'Check the details from the photo, then save.' : 'Snap the SKU or the full front label.'}
    >
      {/* html5-qrcode needs a DOM node to decode photos; it stays hidden. */}
      <div id={PHOTO_READER_ID} className="hidden" />

      {stage.kind !== 'new' && (
        <div className="flex items-start gap-3 mb-4">
          {preview && <img src={preview} alt="Your photo" className="w-20 h-20 rounded-xl object-cover bg-surface shrink-0" />}
          <div className="min-w-0 text-sm">
            {stage.kind === 'reading' && <p className="m-0 text-ink-2">Reading the SKU and label…</p>}
            {stage.kind === 'retake' && <p className="m-0 text-bad font-semibold">{stage.message}</p>}
            {read && (
              <>
                <p className="m-0 font-semibold">
                  {read.captured === 'sku' ? 'SKU / barcode captured' : 'Full label captured'}
                </p>
                {read.barcode && <p className="m-0 num text-ink-2">{read.barcode}</p>}
                {label && <p className="m-0 text-ink-2">{label}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {stage.kind === 'retake' && (
        <SheetActions>
          <button type="button" className="btn btn-tonal" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onRetake}>
            <RotateCcw size={18} />
            Retake photo
          </button>
        </SheetActions>
      )}

      {stage.kind === 'pick' && read && (
        <>
          <div role="radiogroup" aria-label="Adding or scanning out" className="flex bg-surface rounded-full p-1 mb-4">
            {(['in', 'out'] as const).map((m) => {
              const Icon = m === 'in' ? ArrowDownToLine : ArrowUpFromLine
              const active = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-full border-0 py-2.5 text-[15px] font-semibold cursor-pointer ${
                    active ? (m === 'in' ? 'bg-good text-white' : 'bg-action text-white') : 'bg-transparent text-ink-2'
                  }`}
                >
                  <Icon size={18} />
                  {m === 'in' ? 'Adding to inventory' : 'Scanning out'}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-ink-2">How many</span>
            <div className="flex items-center bg-surface rounded-full">
              <button type="button" aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer">
                −
              </button>
              <span className="num min-w-7 text-center font-bold">{qty}</span>
              <button type="button" aria-label="More" onClick={() => setQty((q) => Math.min(999, q + 1))} className="w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer">
                +
              </button>
            </div>
          </div>

          <p className="text-sm font-semibold mt-0 mb-2">
            {read.product ? 'Matched product' : options.length > 0 ? 'Which product is it?' : 'No product in Bintro matches this photo yet.'}
          </p>
          {options.length > 0 && (
            <ul className="list-none m-0 p-0 mb-2">
              {options.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={picked === p.id}
                    onClick={() => setPicked(p.id)}
                    className={`w-full flex items-center gap-3 py-2.5 px-2 mb-1.5 rounded-xl border text-left cursor-pointer ${
                      picked === p.id ? 'border-action bg-surface' : 'border-line bg-transparent'
                    }`}
                  >
                    <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{p.name}</span>
                      <span className="block text-[13px] text-ink-2 truncate">
                        {[p.brand, p.size, p.category, `${p.qty} on hand`].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {picked === p.id && <Check size={18} className="text-action shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!read.product && (
            <button type="button" className="btn btn-text btn-sm" onClick={() => setStage({ kind: 'new', read })}>
              {options.length > 0 ? 'None of these: add it as a new product' : 'Add it as a new product'}
            </button>
          )}

          {error && <p className="text-bad text-sm mt-2 mb-0">{error}</p>}
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={onRetake}>
              <Camera size={18} />
              Retake
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={picked === null || saving}
              onClick={() => picked !== null && log(picked, read.captured)}
            >
              {saving ? 'Saving…' : mode === 'in' ? `Add ${qty} to inventory` : `Scan out ${qty}`}
            </button>
          </SheetActions>
        </>
      )}

      {stage.kind === 'new' && read && (
        <ProductForm
          key={`${read.barcode}-${read.name}`}
          initialBarcode={read.barcode || makeSku(products)}
          initialDetails={{ brand: read.brand, name: read.name, size: read.size, category: read.category }}
          autoLookup={Boolean(read.barcode)}
          products={products}
          qtyLabel="Already on shelf"
          saveLabel={mode === 'in' ? `Save and add ${qty}` : `Save and scan out ${qty}`}
          onCancel={() => setStage({ kind: 'pick', read })}
          onSave={async (values) => {
            const created = (await createProduct({ data: values })) as Product
            await log(created.id, read.captured)
          }}
        />
      )}
    </Sheet>
  )
}
