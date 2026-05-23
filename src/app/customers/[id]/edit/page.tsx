'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '../../../../lib/supabase-client'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import CustomerForm, { CustomerFormValues, EMPTY_CUSTOMER } from '../../../../components/CustomerForm'

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [initial, setInitial] = useState<CustomerFormValues | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('clients').select('*').eq('id', id).single()
      if (data) {
        setName(`${data.first_name || ''} ${data.last_name || ''}`.trim())
        setInitial({
          ...EMPTY_CUSTOMER,
          client_type: data.client_type === 'company' ? 'company' : 'individual',
          company_name: data.company_name ?? '',
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          lifecycle_status: data.lifecycle_status ?? 'lead',
          lead_source: data.lead_source ?? '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          address_line1: data.address_line1 ?? '',
          address_line2: data.address_line2 ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zip_code: data.zip_code ?? '',
          county: data.county ?? '',
          country: data.country ?? 'US',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          google_place_id: data.google_place_id ?? '',
          formatted_address: data.formatted_address ?? '',
          address_verified: !!data.address_verified,
          notes: data.notes ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'Edit', href: '#' }]} />
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Changes Saved!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to customer details...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Customers', href: '/customers' },
        { label: name || 'Customer', href: `/customers/${id}` },
        { label: 'Edit', href: '#' },
      ]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition">
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Customer Hub</p>
            <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          </div>
        </div>
        <CustomerForm
          mode="edit"
          clientId={id}
          initial={initial || EMPTY_CUSTOMER}
          onSaved={() => { setSuccess(true); setTimeout(() => router.push(`/customers/${id}`), 1200) }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  )
}
