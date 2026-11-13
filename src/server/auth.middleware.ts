import { createMiddleware } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { SESSION_COOKIE, authEnabled, userForToken } from './auth.server'
import { DEFAULT_BUSINESS_ID, runForBusiness } from './tenant'
import type { SessionUser } from './auth.server'

/**
 * On every server function: once sign-in is on, refuse anyone without a valid
 * session. Adds `user` (null while sign-in is off) to the context.
 *
 * It also opens the tenant scope for the rest of the request, so every query
 * inside answers for the signed-in person's business and no other. With sign-in
 * off there is only one business on the site, so the scope is business 1.
 */
export const requireUser = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  let user: SessionUser | null = null
  if (authEnabled()) {
    user = await userForToken(getCookie(SESSION_COOKIE))
    if (!user) throw new Error('SIGNED_OUT: Your session ended. Sign in again.')
  }
  return runForBusiness(user?.businessId ?? DEFAULT_BUSINESS_ID, () => next({ context: { user } }))
})

/** Owner-only actions (access list). */
export const requireOwner = createMiddleware({ type: 'function' })
  .middleware([requireUser])
  .server(async ({ next, context }) => {
    if (context.user && context.user.role !== 'owner') throw new Error('Only an owner can do that.')
    return next()
  })
