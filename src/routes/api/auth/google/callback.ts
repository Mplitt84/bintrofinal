import { createFileRoute } from '@tanstack/react-router'
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  createSession,
  finishGoogleSignIn,
  readCookie,
  serializeCookie,
  userForGoogle,
} from '@/server/auth.server'

/** Google sends the browser back here. Checks state, signs the person in if they're on the access list. */
export const Route = createFileRoute('/api/auth/google/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const clearOauth = serializeCookie(OAUTH_COOKIE, '', 0)
        const fail = (reason: string) =>
          new Response(null, { status: 302, headers: { Location: `${url.origin}/?auth=${reason}`, 'Set-Cookie': clearOauth } })

        const code = url.searchParams.get('code')
        if (!code) return fail('cancelled')
        try {
          const profile = await finishGoogleSignIn(
            url.origin,
            { code, state: url.searchParams.get('state') ?? '' },
            readCookie(request, OAUTH_COOKIE),
          )
          const user = await userForGoogle(profile)
          const session = await createSession(user.id, request.headers.get('user-agent') ?? '')
          const headers = new Headers({ Location: `${url.origin}/` })
          headers.append('Set-Cookie', clearOauth)
          headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, session.token, session.maxAge))
          return new Response(null, { status: 302, headers })
        } catch (error) {
          const reason = error instanceof Error && ['state', 'unverified', 'not-allowed', 'google'].includes(error.message) ? error.message : 'google'
          console.error('Google sign-in failed:', reason, error instanceof Error && reason === 'google' ? error : '')
          return fail(reason)
        }
      },
    },
  },
})
