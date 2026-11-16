import { useEffect, useState } from 'react'
import { FlaskConical, Trash2, UserPlus } from 'lucide-react'
import type { AuthState } from '@/lib/auth'
import { addPilotInvite, getPilotInvites, getRefusedSignIns, removePilotInvite } from '@/server/auth.functions'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/components/ui/bits'

type Refused = { email: string; name: string; at: string; tries: number }
type Invite = { id: number; email: string; note: string; invitedAt: string; joinedAt: string | null }

/**
 * Settings: the pilot tester list. Shown only to the site owner. Each email gets its
 * own empty business on first sign-in, so testers never see each other.
 */
export function PilotInvitesPanel({ auth }: { auth: AuthState }) {
  const toast = useToast()
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [refused, setRefused] = useState<Refused[]>([])

  useEffect(() => {
    if (!auth.siteOwner) return
    getPilotInvites().then(setInvites).catch(() => setInvites([]))
    getRefusedSignIns().then(setRefused).catch(() => setRefused([]))
  }, [auth.siteOwner])

  if (!auth.enabled || !auth.siteOwner) return null

  const add = async () => {
    setBusy(true)
    const r = await addPilotInvite({ data: { email, note } })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    setInvites(r.invites)
    setEmail('')
    setNote('')
    toast('Invited. They get their own business the first time they sign in with Google.')
  }

  return (
    <section className="mt-6 bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
        <FlaskConical size={18} className="text-ink-2" /> Pilot testers
      </h3>
      <p className="text-ink-2 text-sm mt-1 mb-3">
        Only you can see this list. Each tester gets their own empty business the first time they sign in, with
        themselves as owner. Testers never see each other, your business or anyone's email, and they can't add anyone to the app.
      </p>
      <ul className="list-none p-0 m-0 mb-3 divide-y divide-line">
        {(invites ?? []).length === 0 && invites && (
          <li className="py-2 text-sm text-ink-2">No testers invited yet.</li>
        )}
        {(invites ?? []).map((i) => (
          <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
            <span className="flex-1 min-w-0 truncate">
              <b>{i.email}</b>
              <span className="text-ink-2">
                {i.note ? ` · ${i.note}` : ''}
                {i.joinedAt ? ` · joined ${timeAgo(i.joinedAt)}` : ' · not signed in yet'}
              </span>
            </span>
            {!i.joinedAt && (
              <button
                className="btn btn-text btn-sm !text-bad"
                onClick={async () => {
                  if (confirmId !== i.id) return setConfirmId(i.id)
                  setConfirmId(null)
                  const r = await removePilotInvite({ data: { id: i.id } })
                  if (!r.ok) return toast(r.message)
                  setInvites(r.invites)
                  toast('Invite taken back.')
                }}
              >
                <Trash2 size={15} /> {confirmId === i.id ? 'Tap again to remove' : 'Remove'}
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 flex-wrap">
        <input
          className="field-input flex-1 min-w-[200px]"
          type="email"
          placeholder="tester@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field-input flex-1 min-w-[160px]"
          placeholder="Note (only you see it)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={busy || !email.trim()} onClick={add}>
          <UserPlus size={15} /> Invite
        </button>
      </div>
      <h4 className="mt-5 mb-1 text-[15px] font-bold">Tried to get in</h4>
      <p className="text-ink-2 text-[12px] mt-0 mb-2">
        Google accounts that tried to sign in without an invite. They saw nothing inside. You also get an email the
        first time each one tries (at most once a day).
      </p>
      {refused.length === 0 ? (
        <p className="text-sm text-ink-2 m-0">Nobody yet.</p>
      ) : (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {refused.map((r) => (
            <li key={r.email} className="py-2 text-sm">
              <b>{r.email}</b>
              <span className="text-ink-2">
                {r.name ? ` · ${r.name}` : ''} · {timeAgo(r.at)}
                {r.tries > 1 ? ` · ${r.tries} tries` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-2 text-[12px] mt-3 mb-0">
        Use the Google account email they'll sign in with. Don't add testers under Sign-in &amp; access — that puts them
        inside your business.
      </p>
    </section>
  )
}
