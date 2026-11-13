import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/components/marketing/LandingPage'

/** Public page explaining what Bintro is. No sign-in; safe to share anywhere. */
export const Route = createFileRoute('/welcome')({
  head: () => ({
    meta: [
      { title: 'Bintro — stock and money for salons, studios and spas' },
      {
        name: 'description',
        content:
          'Scan products in and out, know what to reorder, and see what actually makes money. Built for salons, barbershops, nail and lash studios, tattoo shops and spas.',
      },
      { property: 'og:title', content: 'Bintro — know what’s on your shelf' },
      {
        property: 'og:description',
        content:
          'Stock and money management for salons, studios and spas. Scan in, scan out, and everything else keeps itself up to date.',
      },
    ],
  }),
  component: LandingPage,
})
