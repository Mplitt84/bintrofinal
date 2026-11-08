import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/LegalPage'
import { TERMS } from '@/lib/legal'

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms of Service · Bintro' }] }),
  component: () => <LegalPage title="Terms of Service" sections={TERMS} />,
})
