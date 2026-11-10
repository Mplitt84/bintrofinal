import { useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, X } from 'lucide-react'
import { lockScroll } from '@/lib/scroll-lock'

/**
 * In-app camera for computers and tablets that don't open the camera from a file
 * picker (a laptop browser ignores `capture` and shows the Downloads folder).
 * Live preview, big shutter, returns a JPEG File. Falls back to "Choose a photo".
 */
export function LiveCamera({
  open,
  title,
  hint,
  onClose,
  onPhoto,
  onChooseFile,
}: {
  open: boolean
  title: string
  hint: string
  onClose: () => void
  onPhoto: (file: File) => void
  onChooseFile: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return
    const unlock = lockScroll()
    let cancelled = false
    setError('')
    setReady(false)
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t open the camera. Choose a photo instead.')
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => {})
        }
        setReady(true)
      } catch (e) {
        const name = (e as { name?: string })?.name
        setError(
          name === 'NotAllowedError'
            ? 'Bintro needs camera permission. Allow the camera in your browser, or choose a photo instead.'
            : 'No camera found. Choose a photo instead.',
        )
      }
    })()
    return () => {
      cancelled = true
      unlock()
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [open])

  if (!open) return null

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) onPhoto(new File([blob], `snap-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <div>
          <div className="font-bold text-lg">{title}</div>
          <div className="text-[13px] text-white/75">{hint}</div>
        </div>
        <button type="button" aria-label="Close camera" onClick={onClose} className="w-11 h-11 rounded-full bg-white/15 grid place-items-center border-0 text-white cursor-pointer">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 relative min-h-0">
        <video ref={video} playsInline muted className="absolute inset-0 w-full h-full object-contain" />
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="max-w-[320px] m-0">{error}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-8 py-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <button type="button" onClick={onChooseFile} className="flex flex-col items-center gap-1 bg-transparent border-0 text-white text-[12px] cursor-pointer">
          <span className="w-12 h-12 rounded-full bg-white/15 grid place-items-center">
            <ImageUp size={22} />
          </span>
          Choose photo
        </button>
        <button
          type="button"
          aria-label="Take photo"
          disabled={!ready}
          onClick={shoot}
          className="w-[76px] h-[76px] rounded-full bg-white border-[5px] border-white/40 bg-clip-padding grid place-items-center cursor-pointer disabled:opacity-40"
        >
          <Camera size={28} className="text-black" />
        </button>
        <span className="w-12" aria-hidden="true" />
      </div>
    </div>
  )
}
