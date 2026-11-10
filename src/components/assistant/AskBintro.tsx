import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { useBusiness } from '@/components/business/BusinessContext'
import { askBintroFn } from '@/server/assistant.functions'

type Turn = { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'What is running low?',
  'What sold the most this month?',
  'What should I order this week?',
  'How much is my stock worth?',
  'What have we not used in a while?',
  'Who scanned the most this week?',
]

/** Bintro's mascot: a happy little bin with big eyes. Body follows the brand action color. */
export function BinBuddy({ size = 56, blink = true }: { size?: number; blink?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="block">
      {/* lid handle */}
      <rect x="25" y="5" width="14" height="6" rx="3" fill="none" stroke="var(--color-royal-2, #4a0f1c)" strokeWidth="3" />
      {/* lid */}
      <rect x="9" y="10" width="46" height="8" rx="4" fill="var(--color-royal-2, #4a0f1c)" />
      {/* body */}
      <path d="M13 20 H51 L47.5 55 Q47 59 43 59 H21 Q17 59 16.5 55 Z" fill="var(--color-action, #8B1A2F)" />
      {/* ribs */}
      <path d="M24 46 v7 M32 46 v7 M40 46 v7" stroke="#fff" strokeOpacity=".28" strokeWidth="2.4" strokeLinecap="round" />
      {/* eyes */}
      <g className={blink ? 'bin-buddy-eyes' : undefined}>
        <ellipse cx="24.5" cy="31" rx="5.6" ry="6.4" fill="#fff" />
        <ellipse cx="39.5" cy="31" rx="5.6" ry="6.4" fill="#fff" />
        <circle cx="25.6" cy="32.2" r="3" fill="#1d1416" />
        <circle cx="40.6" cy="32.2" r="3" fill="#1d1416" />
        <circle cx="26.6" cy="30.9" r="1.1" fill="#fff" />
        <circle cx="41.6" cy="30.9" r="1.1" fill="#fff" />
      </g>
      {/* cheeks */}
      <ellipse cx="18.8" cy="39.5" rx="3" ry="1.9" fill="#ff9aa8" opacity=".75" />
      <ellipse cx="45.2" cy="39.5" rx="3" ry="1.9" fill="#ff9aa8" opacity=".75" />
      {/* smile */}
      <path d="M26 39.5 Q32 45.5 38 39.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * "Ask Bintro": the floating bin buddy opens a chat that answers questions
 * about this business's own data (AI, Plus).
 */
export function AskBintro() {
  const { can } = useBusiness()
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const allowed = can('ai')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, busy, open])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setError('')
    setText('')
    const history = turns
    setTurns([...history, { role: 'user', content: q }])
    setBusy(true)
    try {
      const r = await askBintroFn({
        data: {
          question: q,
          history: history.slice(-8),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
          localNow: new Date().toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
        },
      })
      if (r.ok) setTurns((t) => [...t, { role: 'assistant', content: r.text }])
      else setError(r.message)
    } catch {
      setError('Bintro couldn’t answer just now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Bintro a question about your data"
        title="Ask Bintro"
        className="bin-buddy-button fixed z-[41] left-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] min-[1060px]:bottom-6 w-[64px] h-[64px] rounded-full bg-white border border-line shadow-lg grid place-items-center cursor-pointer print:hidden"
      >
        <BinBuddy size={50} />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Ask Bintro"
        subtitle="Ask anything about your stock, sales, orders and counts. Bintro only answers from your own Bintro data."
      >
        {!allowed ? (
          <div className="flex items-center gap-3 bg-surface rounded-2xl p-4">
            <BinBuddy size={48} blink={false} />
            <p className="m-0 text-sm">Ask Bintro comes with Bintro Plus. You can upgrade in Settings → Account &amp; billing.</p>
          </div>
        ) : (
          <>
            <div className="min-h-[200px] max-h-[52vh] overflow-auto pr-1" aria-live="polite">
              {turns.length === 0 && (
                <div className="flex items-start gap-3 mb-4">
                  <BinBuddy size={44} />
                  <div className="bg-surface rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[15px]">
                    Hi! I’m Bintro. Ask me about your stuff, like what’s running low or what sold the most. Try one of these:
                  </div>
                </div>
              )}
              {turns.length === 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 pl-[56px]">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" className="chip !text-[13px]" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {turns.map((t, i) =>
                t.role === 'user' ? (
                  <div key={i} className="flex justify-end mb-3">
                    <div className="bg-action text-white rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] text-[15px] whitespace-pre-wrap">{t.content}</div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2.5 mb-3">
                    <span className="shrink-0 mt-0.5">
                      <BinBuddy size={32} blink={false} />
                    </span>
                    <div className="bg-surface rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[88%] text-[15px] whitespace-pre-wrap leading-relaxed">
                      {t.content}
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex items-center gap-2.5 mb-3">
                  <BinBuddy size={32} />
                  <span className="text-sm text-ink-2">Looking through your data…</span>
                </div>
              )}
              {error && <p className="text-sm text-bad font-semibold">{error}</p>}
              <div ref={endRef} />
            </div>

            <form
              className="flex items-end gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault()
                ask(text)
              }}
            >
              <textarea
                className="field-input flex-1 !py-2.5 resize-none"
                rows={1}
                maxLength={600}
                placeholder="Ask about your stock…"
                aria-label="Your question"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask(text)
                  }
                }}
              />
              <button type="submit" className="btn btn-primary !px-3.5 !py-2.5" disabled={busy || !text.trim()} aria-label="Send">
                <ArrowUp size={18} />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2">
              <p className="m-0 text-[12px] text-ink-2">Bintro can’t change anything. Double-check big decisions.</p>
              {turns.length > 0 && (
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  onClick={() => {
                    setTurns([])
                    setError('')
                  }}
                >
                  Start over
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
