import CRMShell from '@/components/crm/CRMShell'

export const metadata = {
  title: 'Prolink Sales CRM',
  description: 'Internal sales pipeline for Prolink contractor outreach.',
  robots: { index: false, follow: false },
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <CRMShell>{children}</CRMShell>
}
