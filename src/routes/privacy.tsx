import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/LegalPage'
import { PRIVACY } from '@/lib/legal'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy Policy · Bintro' }] }),
  component: () => <LegalPage title="Privacy Policy" sections={PRIVACY} />,
})
