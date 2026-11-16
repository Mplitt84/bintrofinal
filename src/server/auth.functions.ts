import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import type { AuthState } from '@/lib/auth'
import { SESSION_COOKIE, addUser, authEnabled, endSession, isSiteOwner, listUsers, ownerEmail, removeUser, userForToken } from './auth.server'
import { addInvite, listInvites, listRefusedSignIns, removeInvite } from './pilot.server'
import { pilotPremium } from './account.server'
import { signupOpen } from './signup.server'
import { requireOwner, requireSiteOwner } from './auth.middleware'

/** Public: whether sign-in is on and who is signed in. */
const stripBusiness = (u: { id: number; email: string; name: string; role: 'owner' | 'staff' } | null) =>
  u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null

export const getAuthState = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthState> => {
  const enabled = authEnabled()
  const who = enabled ? await userForToken(getCookie(SESSION_COOKIE)) : null
  return {
    enabled,
    // The business id stays on the server; the app only needs who is signed in.
    user: stripBusiness(who),
    siteOwner: isSiteOwner(who),
    // During the pilot only the site owner lets anyone in; testers can't add people.
    canAddPeople: !pilotPremium() || isSiteOwner(who),
    ownerConfigured: Boolean(ownerEmail()),
    signupOpen: enabled && signupOpen(),
  }
})

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await endSession(getCookie(SESSION_COOKIE))
  deleteCookie(SESSION_COOKIE, { path: '/' })
  return { ok: true }
})

export const getAccessList = createServerFn({ method: 'GET' })
  .middleware([requireOwner])
  .handler(async () => listUsers())

export const addAccess = createServerFn({ method: 'POST' })
  .middleware([requireOwner])
  .inputValidator(z.object({ email: z.string().max(200), role: z.enum(['owner', 'staff']) }))
  .handler(async ({ data, context }) => {
    try {
      if (pilotPremium() && context?.user && !isSiteOwner(context.user)) {
        throw new Error('During the pilot, only Bintro can add people. Email hello@bintroapp.com if someone on your team needs access.')
      }
      await addUser(data.email, data.role, context?.user?.email ?? '')
      return { ok: true as const, users: await listUsers() }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : 'Couldn’t add that email.' }
    }
  })

export const removeAccess = createServerFn({ method: 'POST' })
  .middleware([requireOwner])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data, context }) => {
    try {
      await removeUser(data.id, context?.user?.id ?? 0)
      return { ok: true as const, users: await listUsers() }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : 'Couldn’t remove that person.' }
    }
  })

/** Site owner only: the pilot tester invite list. Nobody else ever sees these emails. */
export const getPilotInvites = createServerFn({ method: 'GET' })
  .middleware([requireSiteOwner])
  .handler(async () => listInvites())

export const addPilotInvite = createServerFn({ method: 'POST' })
  .middleware([requireSiteOwner])
  .inputValidator(z.object({ email: z.string().max(200), note: z.string().max(200) }))
  .handler(async ({ data, context }) => {
    try {
      await addInvite(data.email, data.note, context?.user?.email ?? '')
      return { ok: true as const, invites: await listInvites() }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : 'Couldn’t add that invite.' }
    }
  })

export const removePilotInvite = createServerFn({ method: 'POST' })
  .middleware([requireSiteOwner])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    try {
      await removeInvite(data.id)
      return { ok: true as const, invites: await listInvites() }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : 'Couldn’t remove that invite.' }
    }
  })

export const getRefusedSignIns = createServerFn({ method: 'GET' })
  .middleware([requireSiteOwner])
  .handler(async () => listRefusedSignIns())
