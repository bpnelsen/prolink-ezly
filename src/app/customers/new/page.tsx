'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import CustomerForm from '../../../components/CustomerForm'

export default function NewCustomer() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
        <div className="max-w-3xl mx-auto p-4 md:p-8 pt-14 md:pt-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Customer Added!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to Customer Hub...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8 pt-14 md:pt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Customer Hub</p>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 md:mb-8">Add New Customer</h2>
        <CustomerForm
          mode="new"
          onSaved={() => { setSuccess(true); setTimeout(() => router.push('/customers'), 1200) }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  )
}
