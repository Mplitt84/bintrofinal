import { Lock, Mic, Square } from 'lucide-react'
import { DICTATION_ERROR_TEXT, useDictation } from '@/lib/speech'

/** Small mic beside a text field: tap, say the value, and it replaces what's typed. */
export function MicButton({ label, onText }: { label: string; onText: (text: string) => void }) {
  const { supported, listening, error, start, stop } = useDictation()
  if (!supported) return null
  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start((t) => onText(tidy(t))))}
      aria-label={listening ? `Stop listening for ${label}` : `Say the ${label}`}
      aria-pressed={listening}
      title={error ? DICTATION_ERROR_TEXT[error] : `Say the ${label}`}
      className={`mic-btn shrink-0 w-12 rounded-xl border grid place-items-center cursor-pointer ${
        listening ? 'mic-live bg-bad text-white border-bad' : error ? 'bg-bad-tint text-bad border-bad/30' : 'bg-white text-action border-line hover:bg-surface'
      }`}
    >
      {listening ? <Square size={16} fill="currentColor" /> : <Mic size={19} />}
    </button>
  )
}

/** Spoken values come back lowercase with a trailing period on some devices. */
function tidy(text: string) {
  const t = text.trim().replace(/[.。]$/, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * "Speak product details": staff describe the product in one go and AI fills the
 * form (brand, name, size, category, vendor, count, par, cost, retail).
 */
export function SpeakDetails({
  aiOn,
  busy,
  onTranscript,
}: {
  aiOn: boolean
  busy: boolean
  onTranscript: (text: string) => void
}) {
  const { supported, listening, interim, error, start, stop, clearError } = useDictation()

  if (!supported) return null

  if (listening) {
    return (
      <div className="rounded-2xl bg-action-tint p-3.5 mb-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="mic-live w-11 h-11 rounded-full bg-bad text-white grid place-items-center shrink-0" aria-hidden="true">
            <Mic size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <b className="block text-sm text-ink">Listening…</b>
            <p className="m-0 text-[13px] text-ink-2 line-clamp-3">
              {interim || 'Say the brand, product name and size — and the count and prices if you know them.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={stop}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        className="btn btn-tonal w-full"
        disabled={busy}
        onClick={() => {
          clearError()
          start(onTranscript, { continuous: true })
        }}
      >
        <Mic size={18} />
        {busy ? 'Filling in…' : 'Speak product details'}
        {!aiOn && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-ink">
            <Lock size={11} /> Plus fills every field
          </span>
        )}
      </button>
      {error ? (
        <p className="text-bad text-[13px] mt-1.5 mb-0">{DICTATION_ERROR_TEXT[error]}</p>
      ) : (
        <p className="text-ink-2 text-[12px] mt-1.5 mb-0 text-center">
          e.g. “Redken Shades EQ 9V, two ounce, color, we have six, costs eight fifty, sells for nineteen”
        </p>
      )}
    </div>
  )
}
