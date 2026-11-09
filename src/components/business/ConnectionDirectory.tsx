import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, FileSpreadsheet, Plug, Send } from 'lucide-react'
import { useBusiness } from './BusinessContext'
import { useToast } from '@/components/ui/Toast'
import { CONNECTION_DIRECTORY, directoryFor, type DirectoryEntry } from '@/lib/connection-directory'
import { getConnectionRequests, requestConnection } from '@/server/connections.functions'

/**
 * Settings → Connections: the platforms this kind of business most likely uses.
 * "Coming soon" ones can be requested (demand for partnerships); ones with no API
 * point to the sales report upload, which works today. One box for anything else.
 */
export function ConnectionDirectory() {
  const toast = useToast()
  const { profile } = useBusiness()
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const [other, setOther] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    getConnectionRequests()
      .then((rows) => setRequested(new Set(rows.map((r) => (r.platform === 'other' ? `other:${r.name.toLowerCase()}` : r.platform)))))
      .catch(() => undefined)
  }, [])

  const mine = useMemo(() => directoryFor(profile.businessType), [profile.businessType])
  const list = showAll ? CONNECTION_DIRECTORY : mine
  const groups = useMemo(() => {
    const out = new Map<string, DirectoryEntry[]>()
    for (const e of list) out.set(e.kind, [...(out.get(e.kind) ?? []), e])
    return [...out.entries()]
  }, [list])

  async function ask(platform: string, name = '') {
    setSending(platform)
    try {
      await requestConnection({ data: { platform, name } })
      setRequested((s) => new Set(s).add(platform === 'other' ? `other:${name.toLowerCase()}` : platform))
      toast(`Thanks! We've noted that you want ${name || CONNECTION_DIRECTORY.find((e) => e.id === platform)?.name || 'this'} connected.`)
      if (platform === 'other') setOther('')
    } catch {
      toast("Couldn't send that. Try again.")
    } finally {
      setSending(null)
    }
  }

  return (
    <section className="mt-6">
      <h3 className="m-0 text-base font-bold flex items-center gap-1.5">
        <Plug size={18} /> More connections
      </h3>
      <p className="m-0 mt-1 mb-3 text-sm text-ink-2">
        The apps {showAll ? 'shops' : 'businesses like yours'} use most. Tap <b>Request</b> on the one you use: the more shops ask, the sooner it's built.
      </p>

      {groups.map(([kind, entries]) => (
        <div key={kind} className="mb-4">
          <p className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-2">{kind}</p>
          <ul className="list-none m-0 p-0 grid gap-2 min-[620px]:grid-cols-2">
            {entries.map((e) => {
              const done = requested.has(e.id)
              return (
                <li key={e.id} className="rounded-2xl border border-line bg-white p-3.5 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface font-extrabold text-ink shrink-0" aria-hidden="true">
                      {e.name[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-tight flex items-center gap-2 flex-wrap">
                        {e.name}
                        {e.status === 'soon' ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-tint text-gold-ink">Coming soon</span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-good-tint text-good">Works today by upload</span>
                        )}
                      </div>
                      <p className="m-0 mt-0.5 text-[13px] text-ink-2">{e.blurb}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className={`btn btn-sm ${done ? 'btn-tonal' : 'btn-primary'}`}
                      disabled={done || sending === e.id}
                      onClick={() => ask(e.id)}
                    >
                      {done ? (
                        <>
                          <Check size={15} /> Requested
                        </>
                      ) : sending === e.id ? (
                        'Sending…'
                      ) : (
                        'Request this connection'
                      )}
                    </button>
                    {e.status === 'upload' && (
                      <a href="/#scan" className="btn btn-text btn-sm no-underline">
                        <FileSpreadsheet size={15} /> Upload sales
                      </a>
                    )}
                    {e.website && (
                      <a href={e.website} target="_blank" rel="noreferrer" className="btn btn-text btn-sm no-underline ml-auto">
                        Visit <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {!showAll && mine.length < CONNECTION_DIRECTORY.length && (
        <button type="button" className="btn btn-text btn-sm mb-3" onClick={() => setShowAll(true)}>
          Show apps for other kinds of businesses
        </button>
      )}

      <form
        className="rounded-2xl bg-surface p-3.5"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (other.trim()) ask('other', other.trim())
        }}
      >
        <label className="block text-sm font-semibold" htmlFor="conn-other">
          Don't see yours? Tell us which app you use
        </label>
        <div className="flex gap-2 mt-1.5">
          <input
            id="conn-other"
            className="field-input !py-2 flex-1"
            placeholder="e.g. your booking or accounting app"
            value={other}
            maxLength={80}
            onChange={(e) => setOther(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={!other.trim() || sending === 'other'}>
            <Send size={15} /> Send
          </button>
        </div>
      </form>
    </section>
  )
}
