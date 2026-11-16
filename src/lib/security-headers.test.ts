import { describe, expect, it } from 'vitest'
import { withSecurityHeaders } from './security-headers'

describe('withSecurityHeaders', () => {
  it('adds headers to an ordinary response', () => {
    const r = withSecurityHeaders(new Response('hi', { headers: { 'content-type': 'text/plain' } }))
    expect(r.headers.get('X-Frame-Options')).toBe('DENY')
    expect(r.headers.get('content-type')).toBe('text/plain')
  })

  it('keeps a redirect working (its headers are immutable)', () => {
    const r = withSecurityHeaders(Response.redirect('https://connect.squareup.com/oauth2/authorize?x=1', 302))
    expect(r.status).toBe(302)
    expect(r.headers.get('Location')).toBe('https://connect.squareup.com/oauth2/authorize?x=1')
    expect(r.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
