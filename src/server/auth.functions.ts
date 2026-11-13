import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import type { AuthState } from '@/lib/auth'
import { SESSION_COOKIE, addUser, authEnabled, endSession, listUsers, ownerEmail, removeUser, userForToken } from './auth.server'
import { requireOwner } from './auth.middleware'

/** Public: whether sign-in is on and who is signed in. */
const stripBusiness = (u: { id: number; email: string; name: string; role: 'owner' | 'staff' } | null) =>
  u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null

export const getAuthState = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthState> => {
  const enabled = authEnabled()
  return {
    enabled,
    // The business id stays on the server; the app only needs who is signed in.
    user: enabled ? stripBusiness(await userForToken(getCookie(SESSION_COOKIE))) : null,
    ownerConfigured: Boolean(ownerEmail()),
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
