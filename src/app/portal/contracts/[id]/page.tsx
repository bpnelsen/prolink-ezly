'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import { supabase } from '../../../../lib/supabase-client'
import { apiFetch } from '../../../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export default function PortalContractDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<Row | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace(`/portal/login?next=/portal/contracts/${params.id}`); return }
    const r = await apiFetch<Row>(`/api/v1/portal/contracts/${params.id}`)
    if (r.data) setD(r.data)
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /></div>
  }
  if (!d?.contract) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl font-bold text-gray-900 mb-2">Contract not found</p>
        <Link href="/portal" className="text-teal-600 text-sm font-semibold">← Back to portal</Link>
      </div>
    )
  }

  const c = d.contract
  const versions: Row[] = d.versions || []
  const biz = d.business || {}

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <Link href="/portal" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={16} /></Link>
        <p className="text-sm font-bold text-gray-900">Contract {c.contract_number}</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-lg font-bold text-gray-900">{biz.business_name || 'Your Contractor'}</p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <Field label="Contract #" value={c.contract_number} />
            <Field label="Status" value={c.status} />
            <Field label="Amount" value={`$${Number(c.contract_sum).toLocaleString()}`} />
            <Field label="Created" value={c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          <p className="px-5 py-3 text-[10px] uppercase font-bold text-gray-400">Documents</p>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No documents available yet.</p>
          ) : versions.map(v => (
            <div key={v.version_number} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Version {v.version_number}</p>
                  <p className="text-xs text-gray-400">{v.reason} · {new Date(v.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {v.pdf_url && (
                  <a href={v.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
                    <Download size={12} /> Document
                  </a>
                )}
                {v.signed_pdf_url && (
                  <a href={v.signed_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800">
                    <Download size={12} /> Signed
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
      <p className="text-gray-900 font-semibold">{value}</p>
    </div>
  )
}
