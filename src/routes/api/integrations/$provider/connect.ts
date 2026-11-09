import { createFileRoute } from '@tanstack/react-router'
import { routeUser } from '@/server/auth.server'
import { PROVIDERS, buildAuthorizeUrl, isConfigured, type Provider } from '@/server/integrations.server'
import { hasFeature } from '@/server/account.server'

/** Starts the Square / QuickBooks OAuth handshake by redirecting to the provider. */
export const Route = createFileRoute('/api/integrations/$provider/connect')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Signed-in only (owners for connections); sign-in happens on the home page.
        const who = await routeUser(request)
        if (!who || (who !== 'open' && who.role !== 'owner')) return Response.redirect(`${new URL(request.url).origin}/?auth=${who ? 'owner-only' : 'signed-out'}`, 302)
        const origin = new URL(request.url).origin
        const provider = params.provider as Provider
        if (!PROVIDERS.includes(provider)) return new Response('Unknown integration', { status: 404 })
        if (!(await hasFeature(provider))) {
          return Response.redirect(`${origin}/?settings=account&error=${provider}-upgrade`, 302)
        }
        if (!isConfigured(provider)) {
          return Response.redirect(`${origin}/?settings=integrations&error=${provider}-not-configured`, 302)
        }
        return Response.redirect(await buildAuthorizeUrl(provider, origin), 302)
      },
    },
  },
})
