import { useEffect, useState } from 'react'
import { Bell, LogOut, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import type { AccessUser, AuthState } from '@/lib/auth'
import { addAccess, getAccessList, removeAccess, setMyReminders, signOut, updateAccess } from '@/server/auth.functions'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/components/ui/bits'

type Row = AccessUser & { teamName?: string }

/**
 * Settings: who's signed in, their own reminders switch, sign out, and (owners) the invite list:
 * each Google email is linked to a team member, so their scans, visits and clean-up carry their name.
 */
export function AccessPanel({ auth, team = [] }: { auth: AuthState; team?: string[] }) {
  const toast = useToast()
  const [users, setUsers] = useState<Row[] | null>(null)
  const [email, setEmail] = useState('')
  const [teamName, setTeamName] = useState('')
  const [role, setRole] = useState<'staff' | 'owner'>('staff')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [reminders, setReminders] = useState(auth.user?.remindersOn !== false)
  const isOwner = auth.user?.role === 'owner'

  useEffect(() => {
    if (isOwner) getAccessList().then(setUsers).catch(() => setUsers([]))
  }, [isOwner])

  if (!auth.enabled) {
    return (
      <section className="mt-10 bg-white border border-line rounded-2xl p-4">
        <h3 className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
          <ShieldCheck size={18} className="text-ink-2" /> Sign-in
        </h3>
        <p className="text-sm m-0 text-warn">
          Sign-in is off, so anyone with this link can open Bintro and every setting. Turn on Google sign-in by adding GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
          and BINTRO_OWNER_EMAIL in Netlify; then invite your team here and they only see what they need.
        </p>
      </section>
    )
  }

  const invite = async () => {
    setBusy(true)
    const r = await addAccess({ data: { email, role, teamName, sendInvite: true } })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    setUsers(r.users)
    setEmail('')
    setTeamName('')
    toast(r.emailed ? 'Invited. We emailed them how to sign in.' : 'Added. Tell them to sign in with that Google account (the invite email couldn’t be sent).')
  }

  const change = async (u: Row, patch: { role?: 'owner' | 'staff'; teamName?: string }) => {
    const r = await updateAccess({ data: { id: u.id, ...patch } })
    if (!r.ok) return toast(r.message)
    setUsers(r.users)
    toast('Saved')
  }

  return (
    <section className="mt-10 bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
        <ShieldCheck size={18} className="text-ink-2" /> Sign-in &amp; access
      </h3>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <p className="text-sm m-0 flex-1">
          Signed in as <b>{auth.user?.teamName || auth.user?.email}</b>
          {auth.user?.teamName ? <span className="text-ink-2"> · {auth.user.email}</span> : null} {isOwner ? '· owner' : '· team member'}
        </p>
        <button
          className="btn btn-text btn-sm"
          onClick={async () => {
            await signOut()
            window.location.href = '/'
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      <label className="flex items-center gap-2.5 text-sm mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={reminders}
          onChange={async (e) => {
            const on = e.target.checked
            setReminders(on)
            await setMyReminders({ data: { on } }).catch(() => setReminders(!on))
            toast(on ? 'Opening and closing reminders on' : 'Reminders off on every device you use')
          }}
        />
        <Bell size={15} className="text-ink-2" /> Remind me to do the opening and closing jobs
      </label>

      {isOwner && (
        <>
          <p className="text-ink-2 text-sm mt-4 mb-2">
            Only people you invite can sign in. Team members can scan, count, keep records and tick clean-up; only owners can change settings, the team,
            connections and billing.
          </p>
          <ul className="list-none p-0 m-0 mb-3 divide-y divide-line">
            {(users ?? []).map((u) => (
              <li key={u.id} className="py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate">
                    <b>{u.teamName || u.email}</b>
                    <span className="text-ink-2">
                      {u.teamName ? ` · ${u.email}` : ''}
                      {u.lastSignInAt ? ` · signed in ${timeAgo(u.lastSignInAt)}` : ' · hasn’t signed in yet'}
                    </span>
                  </span>
                  {u.id !== auth.user?.id && (
                    <button
                      className="btn btn-text btn-sm !text-bad"
                      onClick={async () => {
                        if (confirmId !== u.id) return setConfirmId(u.id)
                        setConfirmId(null)
                        const r = await removeAccess({ data: { id: u.id } })
                        if (!r.ok) return toast(r.message)
                        setUsers(r.users)
                        toast('Removed. They’re signed out everywhere.')
                      }}
                    >
                      <Trash2 size={15} /> {confirmId === u.id ? 'Tap again to remove' : 'Remove'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <select
                    className="field-input !w-auto !py-1.5 text-sm"
                    value={u.teamName ?? ''}
                    onChange={(e) => change(u, { teamName: e.target.value })}
                    aria-label={`Which team member is ${u.email}`}
                  >
                    <option value="">Not linked to a team member</option>
                    {[...new Set([...(u.teamName ? [u.teamName] : []), ...team])].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  {u.id !== auth.user?.id && (
                    <select
                      className="field-input !w-auto !py-1.5 text-sm"
                      value={u.role}
                      onChange={(e) => change(u, { role: e.target.value as 'owner' | 'staff' })}
                      aria-label={`Role for ${u.email}`}
                    >
                      <option value="staff">Team member</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {auth.canAddPeople === false ? (
            <p className="text-ink-2 text-sm m-0">
              During the pilot, only Bintro can add people. If someone on your team needs access, email{' '}
              <a href="mailto:hello@bintroapp.com">hello@bintroapp.com</a>.
            </p>
          ) : (
            <div className="grid gap-2 bg-surface rounded-xl p-3">
              <b className="text-sm">Invite someone</b>
              <input
                className="field-input"
                type="email"
                placeholder="Their Google email (name@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                <input
                  className="field-input flex-1 min-w-[160px]"
                  list="access-team"
                  placeholder="Their name on the team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
                <datalist id="access-team">
                  {team.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <select className="field-input !w-auto" value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'owner')}>
                  <option value="staff">Team member</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button className="btn btn-primary btn-sm justify-self-start" disabled={busy || !email.trim()} onClick={invite}>
                <UserPlus size={15} /> Invite
              </button>
              <p className="text-ink-2 text-[12px] m-0">They get an email with the link. They sign in with Google — no password to share.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
