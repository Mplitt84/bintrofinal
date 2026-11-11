import { createMiddleware, createStart } from '@tanstack/react-start'

/**
 * Security headers on every page and API response the app server sends (netlify.toml headers
 * only reach static files). Stops other sites from showing Bintro inside a frame.
 */
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  const headers = result.response.headers
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Content-Security-Policy', "frame-ancestors 'none'")
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(self), microphone=(self), bluetooth=(self), geolocation=()')
  return result
})

export const startInstance = createStart(() => ({ requestMiddleware: [securityHeaders] }))
