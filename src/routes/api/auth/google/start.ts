import { createFileRoute } from '@tanstack/react-router'
import { OAUTH_COOKIE, authEnabled, serializeCookie, startGoogleSignIn } from '@/server/auth.server'

/** Sends the browser to Google's sign-in, remembering state/nonce/PKCE in a 10-minute cookie. */
export const Route = createFileRoute('/api/auth/google/start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin
        if (!authEnabled()) return Response.redirect(`${origin}/`, 302)
        const { url, cookie } = startGoogleSignIn(origin)
        return new Response(null, {
          status: 302,
          headers: { Location: url, 'Set-Cookie': serializeCookie(OAUTH_COOKIE, cookie, 600) },
        })
      },
    },
  },
})
