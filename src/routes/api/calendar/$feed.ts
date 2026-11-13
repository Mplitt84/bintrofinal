import { createFileRoute } from '@tanstack/react-router'
import { businessForCalendarToken, findCalendarEvents } from '@/server/calendar.server'
import { findBusinessProfile } from '@/server/business.server'
import { displayBusinessName } from '@/lib/business-types'
import { buildIcs } from '@/lib/calendar'
import { runForBusiness } from '@/server/tenant'

/**
 * Live iCal feed that Google Calendar, Outlook and Apple Calendar subscribe to.
 * The URL carries a secret token (`/api/calendar/<token>.ics`), reset from the Calendar tab.
 */
export const Route = createFileRoute('/api/calendar/$feed')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const token = params.feed.replace(/\.ics$/i, '')
        const business = await businessForCalendarToken(token)
        if (!business) return new Response('Calendar not found', { status: 404 })
        const [events, profile] = await runForBusiness(business, () =>
          Promise.all([findCalendarEvents(), findBusinessProfile()]),
        )
        const name = `${displayBusinessName(profile)} · Bintro`
        return new Response(buildIcs(events, name, new URL(request.url).host), {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="bintro.ics"',
            'Cache-Control': 'public, max-age=300',
          },
        })
      },
    },
  },
})
