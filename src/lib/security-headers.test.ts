import { describe, expect, it } from 'vitest'
import { redirectTo, withSecurityHeaders } from './security-headers'

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

describe('redirectTo', () => {
  it('makes a redirect the server can still add headers and cookies to', () => {
    const r = redirectTo('https://connect.squareup.com/oauth2/authorize?x=1')
    expect(r.status).toBe(302)
    expect(r.headers.get('Location')).toBe('https://connect.squareup.com/oauth2/authorize?x=1')
    expect(() => r.headers.append('Set-Cookie', 'bintro_session=abc; Path=/')).not.toThrow()
  })
})

describe('no immutable redirects in the app', () => {
  it('never uses Response.redirect outside this helper (it 500s once headers are added)', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(name) && !p.includes('security-headers') && /Response\.redirect\(/.test(readFileSync(p, 'utf8'))) offenders.push(p)
      }
    }
    walk(join(process.cwd(), 'src'))
    expect(offenders).toEqual([])
  })
})
