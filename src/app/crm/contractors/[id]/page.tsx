import ContractorDetailClient from '@/components/crm/ContractorDetailClient'

export const dynamic = 'force-dynamic'

export default function ContractorDetailPage({ params }: { params: { id: string } }) {
  return <ContractorDetailClient id={params.id} />
}
