import { createFileRoute } from '@tanstack/react-router'
import { handleStripeWebhook } from '@/server/account.server'

/** Stripe webhook: keeps the plan, pause and card in step with changes made in Stripe. */
export const Route = createFileRoute('/api/billing/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text()
        try {
          await handleStripeWebhook(payload, request.headers.get('stripe-signature') ?? '')
          return new Response('ok')
        } catch (error) {
          console.error('Stripe webhook rejected', error)
          return new Response('Bad request', { status: 400 })
        }
      },
    },
  },
})
