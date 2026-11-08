import { LEGAL, LEGAL_IS_DRAFT, type LegalSection } from '@/lib/legal'

const LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/eula', label: 'End-User License Agreement' },
]

/** A public, printable legal page (Terms, Privacy, EULA). No login needed, so Intuit, Square and customers can read it. */
export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-page text-ink">
      <div className="max-w-[720px] mx-auto px-5 py-10">
        <a href="/" className="text-action font-semibold text-sm no-underline">
          ← {LEGAL.product}
        </a>
        <h1 className="text-[28px] font-bold mt-4 mb-1">{title}</h1>
        <p className="m-0 text-sm text-ink-2">
          {LEGAL.product} · {LEGAL.company} · Effective {LEGAL.effectiveDate}
        </p>
        {LEGAL_IS_DRAFT && (
          <p className="mt-4 mb-0 rounded-xl bg-warn-tint text-warn px-4 py-3 text-sm font-semibold">
            Draft: details in [brackets] still need to be filled in, and this page should be reviewed by a lawyer before
            it's relied on.
          </p>
        )}
        {sections.map((s) => (
          <section key={s.heading} className="mt-7">
            <h2 className="text-lg font-bold mb-2">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-0 mb-2.5 leading-relaxed text-[15px]">
                {p}
              </p>
            ))}
          </section>
        ))}
        <nav className="mt-10 pt-5 border-t border-line flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legal">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-action font-semibold no-underline">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </main>
  )
}

export { LINKS as LEGAL_LINKS }
