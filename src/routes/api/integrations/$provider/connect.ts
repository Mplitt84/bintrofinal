import { redirectTo } from '@/lib/security-headers'
import { createFileRoute } from '@tanstack/react-router'
import { routeUser } from '@/server/auth.server'
import { PROVIDERS, buildAuthorizeUrl, isConfigured, logIntegrationError, type Provider } from '@/server/integrations.server'
import { hasFeature } from '@/server/account.server'
import { businessForRoute } from '@/server/auth.server'
import { runForBusiness } from '@/server/tenant'

/** Starts the Square / QuickBooks OAuth handshake by redirecting to the provider. */
export const Route = createFileRoute('/api/integrations/$provider/connect')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Signed-in only (owners for connections); sign-in happens on the home page.
        const who = await routeUser(request)
        if (!who || (who !== 'open' && who.role !== 'owner')) return redirectTo(`${new URL(request.url).origin}/?auth=${who ? 'owner-only' : 'signed-out'}`, 302)
        return runForBusiness(businessForRoute(who), async () => {
        const origin = new URL(request.url).origin
        const provider = params.provider as Provider
        if (!PROVIDERS.includes(provider)) return new Response('Unknown integration', { status: 404 })
        if (!(await hasFeature(provider))) {
          return redirectTo(`${origin}/?settings=account&error=${provider}-upgrade`, 302)
        }
        if (!isConfigured(provider)) {
          return redirectTo(`${origin}/?settings=integrations&error=${provider}-not-configured`, 302)
        }
        try {
          return redirectTo(await buildAuthorizeUrl(provider, origin), 302)
        } catch (error) {
          // Never a raw 500: log it (Settings → Download error log) and come back with a message.
          const message = error instanceof Error ? error.message : String(error)
          console.error(`${provider} connect failed`, error)
          await logIntegrationError({ provider, action: 'connect-start', message })
          return redirectTo(`${origin}/?settings=integrations&error=${provider}-connect-failed`, 302)
        }
        })
      },
    },
  },
})
