import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/LegalPage'
import { EULA } from '@/lib/legal'

export const Route = createFileRoute('/eula')({
  head: () => ({ meta: [{ title: 'End-User License Agreement · Bintro' }] }),
  component: () => <LegalPage title="End-User License Agreement" sections={EULA} />,
})
