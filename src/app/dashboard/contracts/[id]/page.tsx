'use client'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import ContractDetail from '../../../../components/contracts/ContractDetail'

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Contracts', href: '/dashboard/contracts' },
        { label: params.id.slice(0, 8), href: `/dashboard/contracts/${params.id}` },
      ]} />
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <ContractDetail contractId={params.id} />
      </div>
    </div>
  )
}
