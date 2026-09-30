import { createFileRoute } from '@tanstack/react-router'
import { PROVIDERS, completeAuthorization, type Provider } from '@/server/integrations.server'

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
        if (!code) return back({ error: `${provider}-declined` })
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
          return back({ error: `${provider}-failed` })
        }
      },
    },
  },
})
