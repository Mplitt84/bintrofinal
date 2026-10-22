import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const READER_ID = 'bintro-reader'

type ScannerHandle = { stop: () => Promise<void>; clear: () => void }

/**
 * Full-screen camera barcode scanner. The html5-qrcode library is loaded only
 * when the camera opens, so it never weighs down the first page load.
 */
export function CameraScanner({
  open,
  onClose,
  onScan,
  onTypeInstead,
}: {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
  /** Offered when the camera can't start, so staff are never stuck. */
  onTypeInstead?: () => void
}) {
  const [message, setMessage] = useState('')
  const scannerRef = useRef<ScannerHandle | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setMessage('')

    async function start() {
      let lib: typeof import('html5-qrcode')
      try {
        lib = await import('html5-qrcode')
      } catch {
        if (!cancelled) setMessage('The camera scanner could not load. Check your connection, or type the barcode instead.')
        return
      }
      if (cancelled) return
      const F = lib.Html5QrcodeSupportedFormats
      const formatsToSupport = [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE]
      let handled = false
      const onDecoded = (text: string) => {
        if (handled) return
        handled = true
        stopScanner().then(() => onScanRef.current(text.trim()))
      }
      const config = {
        fps: 12,
        qrbox: (w: number, h: number) => ({
          width: Math.max(80, Math.floor(Math.min(w * 0.82, 340))),
          height: Math.max(60, Math.floor(Math.min(h * 0.32, 170))),
        }),
      }

      // The browser's native barcode detector is fastest, but some devices advertise it and
      // then fail; fall back to the built-in decoder before giving up on the camera.
      let lastError: unknown
      for (const native of [true, false]) {
        if (cancelled) return
        let scanner: InstanceType<typeof lib.Html5Qrcode>
        try {
          scanner = new lib.Html5Qrcode(READER_ID, {
            verbose: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: native },
            formatsToSupport,
          })
        } catch (error) {
          lastError = error
          continue
        }
        scannerRef.current = scanner
        try {
          await scanner.start({ facingMode: 'environment' }, config, onDecoded, () => {})
          // Closed while the camera was starting: stop this scanner, not whatever the ref holds now.
          if (cancelled) await stopScanner(scanner)
          return
        } catch (error) {
          lastError = error
          await stopScanner(scanner)
          // Permission and missing-camera errors won't change with another decoder.
          const name = error instanceof Error ? error.name : String(error)
          if (/NotAllowed|Permission|NotFound|NotReadable|Overconstrained/i.test(name + String(error))) break
        }
      }
      if (!cancelled) {
        console.error('Camera scanner failed to start', lastError)
        setMessage(
          window.isSecureContext === false
            ? 'The camera only works on the secure (https://) address of this site. You can also use a Bluetooth or USB scanner, or type the code.'
            : 'Bintro needs camera access to scan. Allow the camera in your browser settings, then try again. You can also use a Bluetooth or USB scanner, or type the code.',
        )
      }
    }

    start()
    return () => {
      cancelled = true
      stopScanner()
    }
  }, [open])

  async function stopScanner(target: ScannerHandle | null = scannerRef.current) {
    if (!target) return
    if (scannerRef.current === target) scannerRef.current = null
    try {
      await target.stop()
    } catch {
      // Already stopped, or never started.
    }
    try {
      target.clear()
    } catch {
      // Nothing to clear.
    }
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Camera scanner" className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] text-white">
        <strong>Scan a barcode</strong>
        <button
          onClick={onClose}
          className="border-0 bg-white/15 text-white rounded-full px-4 py-2.5 font-semibold cursor-pointer"
        >
          Close
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {/* html5-qrcode owns this node's children, so React never renders into it. */}
        <div id={READER_ID} className="absolute inset-0" />
        {message && (
          <div className="absolute inset-0 m-auto h-fit text-white text-center px-6 py-10 max-w-[420px]">
            <p className="m-0 mb-4">{message}</p>
            {onTypeInstead && (
              <button className="btn btn-primary" onClick={onTypeInstead}>
                Type the barcode
              </button>
            )}
          </div>
        )}
      </div>
      <div className="text-white text-center px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] text-[15px]">
        Hold steady about 6 inches from the barcode
      </div>
    </div>,
    document.body,
  )
}
