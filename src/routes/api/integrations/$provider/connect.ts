import { createFileRoute } from '@tanstack/react-router'
import { PROVIDERS, buildAuthorizeUrl, isConfigured, type Provider } from '@/server/integrations.server'
import { hasFeature } from '@/server/account.server'

/** Starts the Square / QuickBooks OAuth handshake by redirecting to the provider. */
export const Route = createFileRoute('/api/integrations/$provider/connect')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
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
