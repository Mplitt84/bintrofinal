import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, Plus, ScanBarcode, Undo2, X } from 'lucide-react'
import type { ActivityRow, MovementRow, Product } from './types'
import {
  scanMovement,
  createProduct,
  getMovementsSince,
  linkBarcodeToProduct,
  searchProducts,
  undoMovement,
} from '@/server/inventory.functions'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { EmptyState, StatTile, Thumb, dollarsShort, timeAgo } from '@/components/ui/bits'
import { CameraScanner } from './CameraScanner'
import { ProductForm } from './ProductForm'

type Mode = 'in' | 'out'

type Orb =
  | { kind: 'idle' }
  | { kind: 'in' | 'out'; title: string; sub: string }
  | { kind: 'warn'; title: string; sub: string }
  | { kind: 'bad'; title: string; sub: string }

const IDLE_SUB = 'Point your camera at the barcode'

/** Short beep + buzz so staff know a scan landed without looking at the screen. */
let audioCtx: AudioContext | undefined
function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = audioCtx ?? new Ctx()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = ok ? 880 : 220
    o.type = 'sine'
    g.gain.setValueAtTime(0.12, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
    o.connect(g)
    g.connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.2)
  } catch {
    // Sound is a nicety; ignore browsers that block it.
  }
  navigator.vibrate?.(ok ? 40 : [60, 40, 60])
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function ScanView({
  staffName,
  recent,
  products,
  belowParCount,
  onChanged,
  onOpenRestock,
}: {
  staffName: string
  recent: MovementRow[]
  products: Product[]
  belowParCount: number
  onChanged: () => void | Promise<void>
  onOpenRestock?: () => void
}) {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('out')
  const [qty, setQty] = useState(1)
  const [orb, setOrb] = useState<Orb>({ kind: 'idle' })
  const [bump, setBump] = useState(0)
  const [busy, setBusy] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [typedCode, setTypedCode] = useState('')
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null)
  const [unknownTab, setUnknownTab] = useState<'new' | 'link'>('new')
  const [linkQuery, setLinkQuery] = useState('')
  const [linkResults, setLinkResults] = useState<Product[]>([])
  const [today, setToday] = useState<ActivityRow[]>([])
  const orbTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Today's totals refresh whenever the recent feed changes (every scan or undo).
  useEffect(() => {
    getMovementsSince({ data: { since: startOfToday().toISOString() } })
      .then((rows) => setToday(rows as ActivityRow[]))
      .catch(() => {})
  }, [recent])

  useEffect(() => {
    if (!linkQuery.trim()) {
      setLinkResults([])
      return
    }
    const handle = setTimeout(async () => {
      const results = await searchProducts({ data: { query: linkQuery } })
      setLinkResults(results as Product[])
    }, 220)
    return () => clearTimeout(handle)
  }, [linkQuery])

  function showOrb(next: Orb) {
    setOrb(next)
    setBump((b) => b + 1)
    clearTimeout(orbTimer.current)
    if (next.kind !== 'idle' && next.kind !== 'warn') {
      orbTimer.current = setTimeout(() => setOrb({ kind: 'idle' }), 3000)
    }
  }

  const submitScan = useCallback(
    async (code: string, direction: Mode = mode) => {
      const trimmed = code.trim()
      if (!trimmed || busy) return
      setBusy(true)
      try {
        const result = await scanMovement({ data: { barcode: trimmed, type: direction, qty, staffName } })
        if (result.status === 'unknown') {
          beep(true)
          showOrb({ kind: 'warn', title: 'New product', sub: 'Looking it up' })
          setUnknownTab('new')
          setLinkQuery('')
          setUnknownBarcode(result.barcode)
          return
        }
        const p = result.product!
        const movement = result.movement!
        const low = p.qty <= p.reorderThreshold
        beep(true)
        showOrb({
          kind: direction,
          title: direction === 'in' ? `Received ${movement.delta}` : `Taken ${Math.abs(movement.delta)}`,
          sub: `${p.name} · ${p.qty} on hand${low ? ' · below par' : ''}`,
        })
        toast(`${direction === 'in' ? 'Added' : 'Took'} ${Math.abs(movement.delta)} × ${p.name}`, async () => {
          await undoMovement({ data: { movementId: movement.id } })
          await onChanged()
          toast('Scan undone')
        })
        await onChanged()
      } catch {
        beep(false)
        showOrb({ kind: 'bad', title: 'Scan failed', sub: 'Check your connection and try again' })
      } finally {
        setBusy(false)
      }
    },
    // showOrb/toast are stable enough for this handler; mode, qty and staff drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, qty, staffName, busy, onChanged],
  )

  // Bluetooth and USB wand scanners "type" the code fast and press Enter. Catch that
  // anywhere on this screen, as long as nobody is typing in a field or a sheet is open.
  const submitRef = useRef(submitScan)
  submitRef.current = submitScan
  useEffect(() => {
    let buffer = ''
    let lastKey = 0
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('[role="dialog"]')) return
      const now = performance.now()
      if (now - lastKey > 80) buffer = ''
      lastKey = now
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault()
          submitRef.current(buffer)
        }
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function closeUnknown() {
    setUnknownBarcode(null)
    setOrb({ kind: 'idle' })
  }

  async function handleLinkExisting(productId: number) {
    if (!unknownBarcode) return
    await linkBarcodeToProduct({ data: { productId, barcode: unknownBarcode } })
    const code = unknownBarcode
    setUnknownBarcode(null)
    await submitScan(code)
  }

  async function undo(m: MovementRow) {
    await undoMovement({ data: { movementId: m.id } })
    await onChanged()
    toast(`Undid ${m.productName}`)
  }

  const outToday = today.filter((m) => m.delta < 0 && m.type === 'out')
  const unitsOut = outToday.reduce((sum, m) => sum - m.delta, 0)
  const unitsIn = today.filter((m) => m.delta > 0 && m.type === 'in').reduce((sum, m) => sum + m.delta, 0)
  const usedCents = outToday.reduce((sum, m) => sum - m.delta * m.unitCostCents, 0)

  const orbClass =
    orb.kind === 'idle' ? '' : orb.kind === 'in' ? 'orb-in' : orb.kind === 'out' ? 'orb-out' : `orb-${orb.kind}`
  const OrbIcon =
    orb.kind === 'idle' ? ScanBarcode : orb.kind === 'bad' ? X : orb.kind === 'warn' ? Plus : Check

  return (
    <div className="grid gap-6 min-[900px]:grid-cols-[1.1fr_0.9fr] min-[900px]:items-start">
      <div className="bg-surface rounded-[24px] px-5 pt-5 pb-6 flex flex-col items-center text-center">
        <div role="radiogroup" aria-label="Scan direction" className="flex w-full max-w-[360px] bg-white rounded-full p-1 mb-6 shadow-card">
          {(['out', 'in'] as const).map((m) => {
            const Icon = m === 'in' ? ArrowDownToLine : ArrowUpFromLine
            const active = mode === m
            return (
              <button
                key={m}
                role="radio"
                aria-checked={active}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-full border-0 py-2.5 text-[15px] font-semibold cursor-pointer transition-colors ${
                  active ? (m === 'in' ? 'bg-good text-white' : 'bg-action text-white') : 'bg-transparent text-ink-2'
                }`}
              >
                <Icon size={18} />
                {m === 'in' ? 'Scan in' : 'Scan out'}
              </button>
            )
          })}
        </div>

        <button
          key={bump}
          className={`orb ${orbClass} ${bump > 0 && orb.kind !== 'idle' ? 'orb-bump' : ''}`}
          onClick={() => setCameraOpen(true)}
          aria-live="polite"
          disabled={busy}
        >
          <OrbIcon
            size={44}
            strokeWidth={2}
            className={
              orb.kind === 'in' ? 'text-good' : orb.kind === 'warn' ? 'text-warn' : orb.kind === 'bad' ? 'text-bad' : 'text-action'
            }
          />
          <span className="text-2xl font-bold tracking-tight">
            {orb.kind === 'idle' ? (busy ? 'Scanning…' : 'Tap to scan') : orb.title}
          </span>
          <span className="text-sm text-ink-2 max-w-[78%] line-clamp-2">
            {orb.kind === 'idle' ? (mode === 'in' ? 'Receiving stock onto the shelf' : IDLE_SUB) : orb.sub}
          </span>
        </button>

        <div className="flex items-center gap-3 mt-5">
          <span className="text-sm font-semibold text-ink-2">Qty per scan</span>
          <div className="flex items-center bg-white rounded-full shadow-card">
            <button
              aria-label="Fewer per scan"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2"
            >
              −
            </button>
            <span className="num min-w-7 text-center font-bold">{qty}</span>
            <button
              aria-label="More per scan"
              onClick={() => setQty((q) => Math.min(999, q + 1))}
              className="w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2"
            >
              +
            </button>
          </div>
        </div>

        <p className="mt-4 mb-1 text-sm text-ink-2 flex items-center gap-2 justify-center flex-wrap">
          <span className="w-2 h-2 rounded-full bg-good shadow-[0_0_0_4px_var(--color-good-tint)]" aria-hidden="true" />
          Bluetooth and USB scanners work anytime on this screen
        </p>
        <button
          className="btn btn-text"
          onClick={() => {
            setTypedCode('')
            setTyping(true)
          }}
        >
          Type a barcode instead
        </button>
      </div>

      <div>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <StatTile label="Used today" value={unitsOut} />
          <StatTile label="Product used" value={dollarsShort(usedCents)} />
          <StatTile label="Received today" value={unitsIn} tone={unitsIn > 0 ? 'good' : undefined} />
        </div>
        {belowParCount > 0 && (
          <button
            type="button"
            onClick={onOpenRestock}
            className="w-full text-left flex items-center gap-2 bg-warn-tint text-ink rounded-2xl px-3.5 py-3 text-sm -mt-2 mb-5 border-0 cursor-pointer"
          >
            <span className="flex-1">
              <b>{belowParCount}</b> product{belowParCount === 1 ? ' is' : 's are'} at or below par.
            </span>
            <span className="font-semibold text-warn whitespace-nowrap">Restock →</span>
          </button>
        )}
        <h2 className="text-lg font-bold mt-0 mb-2.5">Recent</h2>
        {recent.length === 0 ? (
          <EmptyState title="Nothing scanned yet">Tap the circle to scan your first product.</EmptyState>
        ) : (
          <ul className="list-none m-0 p-0">
            {recent.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                <Thumb imageUrl={m.productImageUrl} label={m.productBrand || m.productName} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.productName}</div>
                  <div className="text-[13px] text-ink-2 truncate">
                    {[m.productBrand, m.staffName || m.staffInitials, timeAgo(m.createdAt)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <b className={`num text-[15px] ${m.delta > 0 ? 'text-good' : 'text-action'}`}>
                  {m.delta > 0 ? '+' : ''}
                  {m.delta}
                </b>
                <button
                  onClick={() => undo(m)}
                  aria-label={`Undo ${m.productName}`}
                  title="Undo"
                  className="w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface"
                >
                  <Undo2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          setCameraOpen(false)
          submitScan(code)
        }}
      />

      <Sheet open={typing} onClose={() => setTyping(false)} title="Type a barcode" subtitle="Use the numbers printed under the bars.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const code = typedCode.trim()
            if (!code) return
            setTyping(false)
            submitScan(code)
          }}
        >
          <Field label="Barcode" htmlFor="typed-code">
            <input
              id="typed-code"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              className="field-input text-center text-xl tracking-[0.12em]"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
            />
          </Field>
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setTyping(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!typedCode.trim()}>
              {mode === 'in' ? 'Scan in' : 'Scan out'}
            </button>
          </SheetActions>
        </form>
      </Sheet>

      <Sheet
        open={unknownBarcode !== null}
        onClose={closeUnknown}
        title="New barcode"
        subtitle={
          <>
            First time scanning <b className="text-ink">{unknownBarcode}</b>. Save it once and Bintro knows it from now
            on.
          </>
        }
      >
        <div className="flex gap-2 mb-4" role="group" aria-label="How to add this barcode">
          <button className="chip" aria-pressed={unknownTab === 'new'} onClick={() => setUnknownTab('new')}>
            New product
          </button>
          <button className="chip" aria-pressed={unknownTab === 'link'} onClick={() => setUnknownTab('link')}>
            Link to an existing product
          </button>
        </div>

        {unknownBarcode && unknownTab === 'new' && (
          <ProductForm
            key={unknownBarcode}
            initialBarcode={unknownBarcode}
            barcodeLocked
            autoLookup
            products={products}
            qtyLabel="Already on shelf"
            saveLabel={mode === 'in' ? 'Save and scan in' : 'Save and scan out'}
            onCancel={closeUnknown}
            onSave={async (values) => {
              await createProduct({ data: values })
              const code = unknownBarcode
              setUnknownBarcode(null)
              await submitScan(code)
            }}
          />
        )}

        {unknownTab === 'link' && (
          <>
            <input
              value={linkQuery}
              onChange={(e) => setLinkQuery(e.target.value)}
              placeholder="Search name, brand or category"
              aria-label="Search existing products"
              autoFocus
              className="field-input"
            />
            <ul className="list-none mt-2 p-0 max-h-72 overflow-auto">
              {linkResults.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleLinkExisting(p.id)}
                    className="w-full flex items-center gap-3 py-2.5 px-1 border-0 border-b border-line bg-transparent text-left cursor-pointer hover:bg-surface rounded-lg"
                  >
                    <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{p.name}</span>
                      <span className="block text-[13px] text-ink-2 truncate">
                        {[p.brand, p.size, p.barcode ? `now ${p.barcode}` : ''].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {linkQuery.trim() && linkResults.length === 0 && (
                <li className="text-ink-2 text-sm py-3">No products match that search.</li>
              )}
            </ul>
            <p className="text-ink-2 text-[13px] mt-3 mb-0">
              Linking replaces that product's barcode with this one, then logs the scan.
            </p>
          </>
        )}
      </Sheet>
    </div>
  )
}
