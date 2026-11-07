import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * Talk-to-text with the browser's built-in speech recognition (Chrome, Edge,
 * Safari on iPhone/iPad/Mac, Samsung Internet). Firefox doesn't support it, so
 * mic buttons hide themselves there.
 */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export type DictationError = '' | 'denied' | 'no-speech' | 'failed'

export const DICTATION_ERROR_TEXT: Record<Exclude<DictationError, ''>, string> = {
  denied: 'Bintro needs the microphone. Allow it in your browser settings, then try again.',
  'no-speech': "Didn't catch that. Tap the mic and speak again.",
  failed: 'Voice input stopped. Check your connection and try again.',
}

/**
 * One dictation session at a time. `start(onDone)` listens until the speaker pauses
 * (or `stop()`), shows words live in `interim`, and hands the full text to `onDone`.
 */
export function useDictation() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<DictationError>('')
  const rec = useRef<Recognition | null>(null)

  useEffect(() => {
    setSupported(!!recognitionCtor())
    return () => rec.current?.abort()
  }, [])

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback((onDone: (text: string) => void, opts: { continuous?: boolean } = {}) => {
    const Ctor = recognitionCtor()
    if (!Ctor) return
    rec.current?.abort()
    const r = new Ctor()
    r.lang = navigator.language || 'en-US'
    r.continuous = opts.continuous ?? false
    r.interimResults = true
    let finalText = ''
    let failed: DictationError = ''
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += `${piece} `
        else live += piece
      }
      setInterim(`${finalText}${live}`.trim())
    }
    r.onerror = (e) => {
      failed = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : e.error === 'aborted' ? '' : 'failed'
    }
    r.onend = () => {
      // A newer session replaced this one; it owns the state now.
      if (rec.current !== r) return
      rec.current = null
      setListening(false)
      setInterim('')
      const text = finalText.trim()
      if (text) onDone(text)
      else setError(failed || 'no-speech')
    }
    rec.current = r
    setError('')
    setInterim('')
    setListening(true)
    try {
      r.start()
    } catch {
      setListening(false)
      setError('failed')
    }
  }, [])

  return { supported, listening, interim, error, start, stop, clearError: () => setError('') }
}
