import { createFileRoute } from '@tanstack/react-router'
import { PROVIDERS, StateMismatchError, completeAuthorization, logIntegrationError, type Provider } from '@/server/integrations.server'

/** Where Square / QuickBooks send the owner back after approving (or declining) the connection. */
export const Route = createFileRoute('/api/integrations/$provider/callback')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url)
        const provider = params.provider as Provider
        if (!PROVIDERS.includes(provider)) return new Response('Unknown integration', { status: 404 })

        const back = (query: Record<string, string>) =>
          Response.redirect(`${url.origin}/?${new URLSearchParams({ settings: 'integrations', ...query })}`, 302)

        const code = url.searchParams.get('code')
        // Declined, or the provider sent an error (e.g. access_denied) instead of a code.
        if (!code) {
          const reason = url.searchParams.get('error') ?? ''
          if (reason && reason !== 'access_denied')
            await logIntegrationError({ provider, action: 'connect', code: reason, message: url.searchParams.get('error_description') ?? 'Authorization returned an error' })
          return back({ error: `${provider}-declined` })
        }
        try {
          await completeAuthorization(
            provider,
            {
              code,
              state: url.searchParams.get('state') ?? '',
              realmId: url.searchParams.get('realmId') ?? undefined,
            },
            url.origin,
          )
          return back({ connected: provider })
        } catch (error) {
          console.error(`${provider} connect failed`, error)
          await logIntegrationError({
            provider,
            action: 'connect',
            code: error instanceof StateMismatchError ? 'state_mismatch' : '',
            message: error instanceof Error ? error.message : String(error),
          })
          return back({ error: `${provider}-${error instanceof StateMismatchError ? 'expired' : 'failed'}` })
        }
      },
    },
  },
})
