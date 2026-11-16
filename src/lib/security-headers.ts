/**
 * Security headers for every response the app server sends. Some responses can't be
 * changed after they're made (`Response.redirect()` has immutable headers, and setting
 * one throws), so those are copied first. Never throws for any response.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), bluetooth=(self), geolocation=()',
}

export function withSecurityHeaders(response: Response): Response {
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v)
    return response
  } catch {
    const headers = new Headers(response.headers)
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}

/**
 * A redirect whose headers can still be changed. `Response.redirect()` makes immutable
 * headers, and the server adds headers (security headers, the sign-in session cookie)
 * to every response afterwards, which threw "TypeError: immutable" → a 500 on every
 * Connect Square / QuickBooks, callback, Stripe return and Google sign-in redirect.
 * Use this instead of Response.redirect everywhere.
 */
export function redirectTo(url: string | URL, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
  return new Response(null, { status, headers: { Location: String(url) } })
}
