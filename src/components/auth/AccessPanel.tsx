import { useEffect, useState } from 'react'
import { LogOut, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import type { AccessUser, AuthState } from '@/lib/auth'
import { addAccess, getAccessList, removeAccess, signOut } from '@/server/auth.functions'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/components/ui/bits'

/** Settings: who's signed in, sign out, and (owners) the list of Google accounts allowed in. */
export function AccessPanel({ auth }: { auth: AuthState }) {
  const toast = useToast()
  const [users, setUsers] = useState<AccessUser[] | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'owner'>('staff')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
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
          Sign-in is off, so anyone with this link can open Bintro. Turn on Google sign-in by adding GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET and BINTRO_OWNER_EMAIL in Netlify.
        </p>
      </section>
    )
  }

  const add = async () => {
    setBusy(true)
    const r = await addAccess({ data: { email, role } })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    setUsers(r.users)
    setEmail('')
    toast(`Added. They can now sign in with that Google account.`)
  }

  return (
    <section className="mt-10 bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
        <ShieldCheck size={18} className="text-ink-2" /> Sign-in &amp; access
      </h3>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <p className="text-sm m-0 flex-1">
          Signed in as <b>{auth.user?.email}</b> {isOwner ? '· owner' : ''}
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

      {isOwner && (
        <>
          <p className="text-ink-2 text-sm mt-3 mb-2">
            People who can sign in with Google. Turn on 2-Step Verification in each Google account for the strongest protection.
          </p>
          <ul className="list-none p-0 m-0 mb-3 divide-y divide-line">
            {(users ?? []).map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1 min-w-0 truncate">
                  <b>{u.email}</b>
                  <span className="text-ink-2">
                    {' '}
                    · {u.role}
                    {u.lastSignInAt ? ` · signed in ${timeAgo(u.lastSignInAt)}` : ' · not signed in yet'}
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
              </li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap">
            <input
              className="field-input flex-1 min-w-[200px]"
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="field-input !w-auto" value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'owner')}>
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </select>
            <button className="btn btn-primary btn-sm" disabled={busy || !email.trim()} onClick={add}>
              <UserPlus size={15} /> Add
            </button>
          </div>
          <p className="text-ink-2 text-[12px] mt-2 mb-0">Owners can manage this list, connections and billing.</p>
        </>
      )}
    </section>
  )
}
