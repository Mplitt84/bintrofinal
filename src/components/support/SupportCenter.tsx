import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BellRing, MessageCircle, Send } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { Sheet } from '@/components/ui/Sheet'
import type { SupportMessage } from '@/server/support.server'
import {
  getAlertKey,
  getMySupportThread,
  getMySupportUnread,
  getSupportInbox,
  getSupportUnread,
  markSupportRead,
  replySupport,
  sendSupportMessage,
  subscribeAlerts,
} from '@/server/support.functions'

const OPEN_SUPPORT = 'bintro:open-support'
const OPEN_INBOX = 'bintro:open-inbox'

/** Open the "Message Bintro" sheet from anywhere. */
export const openSupport = (kind: 'question' | 'problem' = 'question') => window.dispatchEvent(new CustomEvent(OPEN_SUPPORT, { detail: kind }))
/** Site owner: open the help-line inbox from anywhere. */
export const openInbox = () => window.dispatchEvent(new Event(OPEN_INBOX))

const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/**
 * Mounted once in the app. Everyone: the Message Bintro sheet and a "Bintro replied" banner.
 * The site owner: the inbox across every shop, a "new message" banner, and phone alerts.
 */
export function SupportHost({ siteOwner, myName, page }: { siteOwner: boolean; myName: string; page: string }) {
  const [composeOpen, setComposeOpen] = useState<null | 'question' | 'problem'>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [banner, setBanner] = useState<{ text: string; open: () => void } | null>(null)
  const seen = useRef<string>('')

  useEffect(() => {
    const a = (e: Event) => setComposeOpen(((e as CustomEvent).detail as 'question' | 'problem') ?? 'question')
    const b = () => setInboxOpen(true)
    window.addEventListener(OPEN_SUPPORT, a)
    window.addEventListener(OPEN_INBOX, b)
    return () => {
      window.removeEventListener(OPEN_SUPPORT, a)
      window.removeEventListener(OPEN_INBOX, b)
    }
  }, [])

  // Poll for news: replies for a shop, new messages for the site owner.
  useEffect(() => {
    let live = true
    const poll = async () => {
      try {
        if (siteOwner) {
          const { unread } = await getSupportUnread()
          const key = unread.map((u) => u.id).join(',')
          if (live && unread.length && key !== seen.current) {
            const first = unread[0]
            setBanner({
              text: unread.length === 1 ? `${first.kind === 'question' ? '💬' : '🚨'} ${first.businessName}: ${first.body.slice(0, 80)}` : `${unread.length} new messages from shops`,
              open: () => setInboxOpen(true),
            })
          }
          if (!unread.length) setBanner(null)
        } else {
          const { unread } = await getMySupportUnread()
          if (live && unread > 0) setBanner({ text: 'Bintro replied to your message', open: () => setComposeOpen('question') })
          if (!unread) setBanner(null)
        }
      } catch {
        /* offline or signed out: try next time */
      }
    }
    poll()
    const t = window.setInterval(poll, siteOwner ? 60_000 : 120_000)
    window.addEventListener('focus', poll)
    return () => {
      live = false
      window.clearInterval(t)
      window.removeEventListener('focus', poll)
    }
  }, [siteOwner])

  return (
    <>
      {banner && !composeOpen && !inboxOpen && (
        <button
          type="button"
          onClick={() => {
            seen.current = ''
            banner.open()
            setBanner(null)
          }}
          className="fixed z-[46] top-[calc(64px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 max-w-[92vw] bg-ink text-white rounded-full px-4 py-2 text-sm font-semibold shadow-lg border-0 cursor-pointer flex items-center gap-2 print:hidden"
        >
          <MessageCircle size={16} /> <span className="truncate">{banner.text}</span>
        </button>
      )}
      {composeOpen && <SupportSheet kind={composeOpen} myName={myName} page={page} onClose={() => setComposeOpen(null)} />}
      {inboxOpen && siteOwner && (
        <InboxSheet
          onClose={() => {
            setInboxOpen(false)
            seen.current = ''
          }}
        />
      )}
    </>
  )
}

/** A shop's side: its conversation with Bintro and a box to write. */
function SupportSheet({ kind: startKind, myName, page, onClose }: { kind: 'question' | 'problem'; myName: string; page: string; onClose: () => void }) {
  const toast = useToast()
  const [thread, setThread] = useState<SupportMessage[] | null>(null)
  const [kind, setKind] = useState(startKind)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMySupportThread()
      .then((r) => setThread(r.thread))
      .catch(() => setThread([]))
  }, [])
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [thread])

  async function send() {
    setSending(true)
    try {
      const r = await sendSupportMessage({ data: { kind, body, page, device: navigator.userAgent.slice(0, 200), fromName: myName } })
      if (!r.ok) return toast(r.message)
      setThread(r.thread)
      setBody('')
      toast('Sent. Bintro gets it right away.')
    } catch {
      toast('Couldn’t send — check your signal and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Message Bintro" subtitle="Goes straight to the Bintro team’s phone. No email needed — replies show up right here.">
      <div className="max-h-[45vh] overflow-y-auto grid gap-2 mb-3">
        {!thread ? (
          <div className="skel h-20 rounded-xl" />
        ) : thread.length === 0 ? (
          <p className="text-sm text-ink-2 m-0">Ask anything, or tell us what isn’t working — what you tapped and what happened.</p>
        ) : (
          thread.map((m) => <Bubble key={m.id} m={m} mine={m.direction === 'in'} />)
        )}
        <div ref={end} />
      </div>
      <div className="flex gap-1.5 mb-2" role="group" aria-label="What is it">
        <button type="button" className="chip" aria-pressed={kind === 'question'} onClick={() => setKind('question')}>
          <MessageCircle size={13} className="inline -mt-0.5" /> I have a question
        </button>
        <button type="button" className="chip" aria-pressed={kind === 'problem'} onClick={() => setKind('problem')}>
          <AlertTriangle size={13} className="inline -mt-0.5" /> Something’s not working
        </button>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          className="field-input flex-1 min-h-[70px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={kind === 'problem' ? 'What were you doing, and what went wrong?' : 'Type your question'}
          maxLength={4000}
        />
        <button type="button" className="btn btn-primary" disabled={sending || !body.trim()} onClick={send} aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </Sheet>
  )
}

function Bubble({ m, mine }: { m: SupportMessage; mine: boolean }) {
  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'justify-self-end bg-royal text-white' : 'justify-self-start bg-surface'}`}>
      {m.kind === 'problem' && <b className="block text-[11px] uppercase opacity-80">Something’s not working</b>}
      {m.kind === 'auto-error' && <b className="block text-[11px] uppercase opacity-80">Sent automatically</b>}
      <span className="whitespace-pre-wrap">{m.body}</span>
      <span className="block text-[10px] opacity-70 mt-0.5">
        {m.direction === 'out' ? `${m.fromName || 'Bintro'} · ` : m.fromName ? `${m.fromName} · ` : ''}
        {when(m.createdAt)}
      </span>
    </div>
  )
}

/** The site owner's side: every shop's thread, replies, and alerts on this phone. */
function InboxSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [alerts, setAlerts] = useState<'unknown' | 'on' | 'off' | 'blocked' | 'unsupported'>('unknown')

  const load = useCallback(async () => {
    try {
      setMessages((await getSupportInbox()).messages)
    } catch {
      setMessages([])
    }
  }, [])
  useEffect(() => {
    load()
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setAlerts('unsupported')
    if (Notification.permission === 'denied') return setAlerts('blocked')
    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setAlerts(sub ? 'on' : 'off'))
      .catch(() => setAlerts('off'))
  }, [load])

  const threads = useMemo(() => {
    const m = new Map<number, { businessId: number; name: string; last: SupportMessage; unread: number; problem: boolean }>()
    for (const msg of messages ?? []) {
      const t = m.get(msg.businessId) ?? { businessId: msg.businessId, name: msg.businessName, last: msg, unread: 0, problem: false }
      if (msg.direction === 'in' && !msg.readAt) {
        t.unread++
        if (msg.kind !== 'question') t.problem = true
      }
      m.set(msg.businessId, t)
    }
    return [...m.values()].sort((a, b) => b.unread - a.unread || (a.last.createdAt < b.last.createdAt ? 1 : -1))
  }, [messages])
  const thread = (messages ?? []).filter((m) => m.businessId === open).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  async function turnOnAlerts() {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return setAlerts('blocked')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { publicKey } = await getAlertKey()
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0))
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }))
      const j = sub.toJSON()
      await subscribeAlerts({ data: { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '', userAgent: navigator.userAgent.slice(0, 300) } })
      setAlerts('on')
      toast('Alerts are on for this device — a test is on its way.')
    } catch {
      toast('This browser wouldn’t turn alerts on. On iPhone, add Bintro to your Home Screen first.')
    }
  }

  async function send() {
    if (!open) return
    setBusy(true)
    try {
      const r = await replySupport({ data: { businessId: open, body: reply } })
      if (!r.ok) return toast(r.message)
      setMessages(r.messages)
      setReply('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={open ? (threads.find((t) => t.businessId === open)?.name ?? 'Messages') : 'Messages from shops'} subtitle={open ? 'Your reply shows in their app right away.' : 'Questions and problems from pilot shops.'}>
      {!open && (
        <div className="bg-surface rounded-xl p-3 mb-3 text-sm flex items-center gap-2 flex-wrap">
          <BellRing size={16} />
          <span className="flex-1">
            {alerts === 'on'
              ? 'Alerts are on for this device.'
              : alerts === 'blocked'
                ? 'Notifications are blocked for Bintro in this browser’s settings.'
                : alerts === 'unsupported'
                  ? 'This browser can’t get alerts. On iPhone, add Bintro to the Home Screen and open it from there.'
                  : 'Get a notification on this phone the moment a shop writes or hits a problem.'}
          </span>
          {alerts === 'off' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={turnOnAlerts}>
              Turn on alerts
            </button>
          )}
        </div>
      )}
      {!messages ? (
        <div className="skel h-24 rounded-xl" />
      ) : open ? (
        <>
          <button type="button" className="btn btn-text btn-sm mb-2" onClick={() => setOpen(null)}>
            ← All shops
          </button>
          <div className="max-h-[45vh] overflow-y-auto grid gap-2 mb-3">
            {thread.map((m) => (
              <Bubble key={m.id} m={m} mine={m.direction === 'out'} />
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <textarea className="field-input flex-1 min-h-[70px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" maxLength={4000} />
            <button type="button" className="btn btn-primary" disabled={busy || !reply.trim()} onClick={send} aria-label="Send reply">
              <Send size={16} />
            </button>
          </div>
        </>
      ) : threads.length === 0 ? (
        <p className="text-sm text-ink-2">No messages yet. Shops write from Settings → Help, or from the Ask Bintro button.</p>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-line">
          {threads.map((t) => (
            <li key={t.businessId}>
              <button
                type="button"
                className="w-full text-left py-2.5 bg-transparent border-0 cursor-pointer flex gap-2 items-start"
                onClick={async () => {
                  setOpen(t.businessId)
                  if (t.unread) {
                    await markSupportRead({ data: { businessId: t.businessId } }).catch(() => {})
                    load()
                  }
                }}
              >
                <span className="flex-1 min-w-0">
                  <b className="block text-[15px] truncate">
                    {t.problem && <AlertTriangle size={14} className="inline -mt-0.5 text-bad mr-1" />}
                    {t.name}
                  </b>
                  <span className="block text-[13px] text-ink-2 truncate">
                    {t.last.direction === 'out' ? 'You: ' : ''}
                    {t.last.body}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-[11px] text-ink-2">{when(t.last.createdAt)}</span>
                  {t.unread > 0 && <span className="inline-block mt-1 bg-bad text-white rounded-full text-[11px] font-bold px-2">{t.unread}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
