import { useEffect, useState } from 'react'
import { Check, Mail, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { runSetupCheck, sendSetupTestEmail } from '@/server/setup.functions'

type Result = Awaited<ReturnType<typeof runSetupCheck>>
type Tone = 'good' | 'warn' | 'bad'

function Row({ tone, title, children }: { tone: Tone; title: string; children?: React.ReactNode }) {
  const Icon = tone === 'good' ? Check : tone === 'warn' ? TriangleAlert : X
  return (
    <li className="flex items-start gap-3 py-3 border-b border-line last:border-b-0">
      <span
        className={`shrink-0 w-7 h-7 rounded-full grid place-items-center ${
          tone === 'good' ? 'bg-good-tint text-good' : tone === 'warn' ? 'bg-warn-tint text-warn' : 'bg-bad-tint text-bad'
        }`}
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0 text-sm">
        <div className="font-semibold">{title}</div>
        {children && <div className="text-ink-2 mt-0.5">{children}</div>}
      </div>
    </li>
  )
}

const dollars = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`

/**
 * Settings → Setup check: shows which keys this site has in Netlify and tests the
 * ones that can be tested safely (AI, Stripe read-only). Never shows a key's value.
 */
export function SetupCheck() {
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mail, setMail] = useState<{ state: 'idle' | 'sending' } | { state: 'done'; ok: boolean; text: string }>({ state: 'idle' })

  async function run() {
    setBusy(true)
    setError('')
    try {
      setResult(await runSetupCheck())
    } catch {
      setError("Couldn't run the check. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    run()
  }, [])

  async function testEmail() {
    setMail({ state: 'sending' })
    try {
      const r = await sendSetupTestEmail()
      setMail({ state: 'done', ok: r.ok, text: r.ok ? `Sent to ${r.to}. Check that inbox (and spam).` : r.message })
    } catch {
      setMail({ state: 'done', ok: false, text: "Couldn't send. Check your connection and try again." })
    }
  }

  const s = result?.stripe
  const stripeTone: Tone = !s
    ? 'warn'
    : s.secretKey === 'live' || s.secretKey === 'restricted'
      ? 'good'
      : s.secretKey === 'test'
        ? 'warn'
        : 'bad'

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="m-0 text-sm text-ink-2">
          What this site has set up in Netlify. Keys are never shown here, only whether they work.
        </p>
        <button type="button" className="btn btn-tonal btn-sm shrink-0" onClick={run} disabled={busy}>
          <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Checking…' : 'Check again'}
        </button>
      </div>
      {error && <p className="text-bad text-sm font-semibold">{error}</p>}
      {!result && busy && <p className="text-ink-2 text-sm">Testing each connection…</p>}

      {result && s && (
        <ul className="list-none m-0 p-0 bg-white border border-line rounded-2xl px-4">
          <Row tone={result.ai.ok ? 'good' : 'bad'} title={result.ai.ok ? 'AI is working' : 'AI is not working'}>
            {result.ai.ok
              ? 'Price checks, Snap & log, invoice, receipt and sales report reading are all available.'
              : result.ai.detail}
          </Row>

          <Row
            tone={stripeTone}
            title={
              s.secretKey === 'missing'
                ? 'Payments: not set up (plans change with no charge)'
                : s.secretKey === 'invalid'
                  ? 'Payments: the Stripe key was rejected'
                  : `Payments: Stripe ${s.secretKey === 'test' ? 'test mode' : 'live'}${s.account ? ` · ${s.account}` : ''}`
            }
          >
            {s.secretKey === 'missing' && 'Add STRIPE_SECRET_KEY in Netlify.'}
            {s.secretKey === 'invalid' && 'Re-copy the secret key from Stripe → Developers → API keys.'}
            {s.secretKey === 'test' && 'Test mode: cards are not really charged. Switch to the live key before launch.'}
            {s.secretKey !== 'missing' && !s.webhookSecret && (
              <span className="block">Missing STRIPE_WEBHOOK_SECRET, so cancellations and failed payments made in Stripe won't reach the app.</span>
            )}
          </Row>
          {s.secretKey !== 'missing' &&
            s.prices.map((p) => (
              <Row
                key={p.env}
                tone={p.status === 'ok' ? 'good' : p.status === 'missing' ? 'bad' : 'warn'}
                title={`${p.plan} ${p.interval === 'month' ? 'monthly' : 'yearly'} · ${dollars(p.expectedCents)}/${p.interval === 'month' ? 'mo' : 'yr'}`}
              >
                {p.status === 'ok' ? 'Price found in Stripe and it matches.' : p.status === 'missing' ? `Add ${p.env} in Netlify.` : p.detail}
              </Row>
            ))}

          <Row
            tone={result.email.provider ? 'good' : 'bad'}
            title={result.email.provider ? `Email: ${result.email.provider}` : 'Email: not set up'}
          >
            {result.email.provider ? (
              <>
                {result.email.customSender
                  ? 'Sending from your own address (RESTOCK_EMAIL_FROM).'
                  : "Sending from Resend's shared address; replies go to your business email."}
                <span className="block mt-2">
                  <button type="button" className="btn btn-tonal btn-sm" onClick={testEmail} disabled={mail.state === 'sending'}>
                    <Mail size={15} />
                    {mail.state === 'sending' ? 'Sending…' : 'Send me a test email'}
                  </button>
                </span>
                {mail.state === 'done' && (
                  <span className={`block mt-1.5 font-semibold ${mail.ok ? 'text-good' : 'text-bad'}`}>{mail.text}</span>
                )}
              </>
            ) : (
              'Add RESEND_API_KEY in Netlify. Until then, restock lists and orders open in your mail app instead.'
            )}
          </Row>

          <Row tone={result.square ? 'good' : 'warn'} title={result.square ? 'Square: app keys set' : 'Square: app keys missing'}>
            {result.square ? 'Connect or check it under Connections.' : 'Add SQUARE_APPLICATION_ID and SQUARE_APPLICATION_SECRET.'}
          </Row>
          <Row
            tone={result.quickbooks ? 'good' : 'warn'}
            title={result.quickbooks ? 'QuickBooks: app keys set' : 'QuickBooks: app keys missing'}
          >
            {result.quickbooks ? 'Connect or check it under Connections.' : 'Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.'}
          </Row>
          <Row tone="good" title={result.pilot ? 'Pilot site: Premium included for testers' : 'Main site: normal plans'} />
        </ul>
      )}
    </section>
  )
}
