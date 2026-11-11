import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'


import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#fffdf7' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Bintro' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      {
        title: 'Bintro — Inventory & budget',
      },
      { name: 'description', content: 'Bintro tracks stock, orders, client records and spending for salons, barbershops, spas and tattoo studios.' },
      { property: 'og:title', content: 'Bintro' },
      { property: 'og:description', content: 'Inventory, orders, client records and budget for wellness and body art spaces.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: '/icon-512.png' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
