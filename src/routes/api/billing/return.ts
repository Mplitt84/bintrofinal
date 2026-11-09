import { createFileRoute } from '@tanstack/react-router'
import { routeUser } from '@/server/auth.server'
import { completeCheckout } from '@/server/account.server'

/** Where Stripe Checkout sends the owner after paying. Saves the subscription, then opens Settings → Account. */
export const Route = createFileRoute('/api/billing/return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Signed-in only (owners for connections); sign-in happens on the home page.
        const who = await routeUser(request)
        if (!who) return Response.redirect(`${new URL(request.url).origin}/?auth=${who ? 'owner-only' : 'signed-out'}`, 302)
        const url = new URL(request.url)
        const back = (query: Record<string, string>) =>
          Response.redirect(`${url.origin}/?${new URLSearchParams({ settings: 'account', ...query })}`, 302)
        const sessionId = url.searchParams.get('session_id')
        if (!sessionId) return back({ billing: 'canceled' })
        try {
          const plan = await completeCheckout(sessionId)
          return back({ billing: 'subscribed', plan })
        } catch (error) {
          console.error('Checkout return failed', error)
          return back({ billing: 'failed' })
        }
      },
    },
  },
})
