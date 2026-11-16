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
