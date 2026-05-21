'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { parseCSV, CSV_COLUMNS } from '@/lib/crm-csv'
import { crmAPI } from '@/lib/crm-client'

type Result = { inserted: number; skipped: number; errors: string[] } | null

export default function ImportPage() {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [header, setHeader] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setParsing(true)
    const txt = await file.text()
    setText(txt); setParsing(false)
    parseAndPreview(txt)
  }

  const parseAndPreview = (txt: string) => {
    setError(null); setResult(null)
    if (!txt.trim()) return
    const rows = parseCSV(txt)
    if (rows.length < 2) {
      setError('CSV needs a header row and at least one data row.')
      setPreview(null)
      return
    }
    const headerRow = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const dataRows = rows.slice(1, 11)
    setHeader(headerRow)
    setPreview(dataRows)
  }

  const doImport = async () => {
    if (!text.trim()) return
    setImporting(true); setError(null); setResult(null)
    try {
      const rows = parseCSV(text)
      const headerRow = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const records = rows.slice(1).map(r => {
        const obj: Record<string, string> = {}
        headerRow.forEach((k, i) => { if (r[i] != null) obj[k] = r[i] })
        return obj
      })
      const res = await crmAPI.contractors.importCSV(records)
      setResult(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/crm/contractors" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> All contractors
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import contractors</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV with a header row, or paste CSV text below. Up to 5,000 rows per upload.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Recognized columns</p>
          <div className="flex flex-wrap gap-1.5">
            {CSV_COLUMNS.map(c => (
              <span key={c} className="text-[11px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Header names are lowercased and spaces → underscores. Unknown columns are ignored. <code className="text-[10px] bg-gray-100 px-1">business_name</code> is required.
          </p>
        </div>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Upload a .csv file</span>
          <input
            type="file" accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="block text-sm text-gray-700"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">…or paste CSV text</span>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); parseAndPreview(e.target.value) }}
            rows={8}
            placeholder="business_name,phone,email,city,state&#10;ACME Plumbing,8015550100,foo@example.com,Salt Lake City,UT"
            className="w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          />
        </label>

        {parsing && <p className="text-sm text-gray-500">Reading file…</p>}
        {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>}

        {preview && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Preview (first 10 rows)</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {header.map((h, i) => (
                      <th key={i} className={`text-left px-3 py-2 font-bold ${CSV_COLUMNS.includes(h as any) ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-gray-700 max-w-xs truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={doImport}
          disabled={importing || !text.trim()}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          <Upload size={14} /> {importing ? 'Importing…' : 'Import all rows'}
        </button>

        {result && (
          <div className={`rounded-lg p-4 border ${result.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className="font-bold text-gray-900 flex items-center gap-1.5">
              <CheckCircle size={16} className={result.errors.length > 0 ? 'text-amber-700' : 'text-emerald-700'} />
              Imported {result.inserted.toLocaleString()} · Skipped {result.skipped.toLocaleString()}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-gray-700 list-disc list-inside space-y-0.5">
                {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 20 && <li>… and {result.errors.length - 20} more</li>}
              </ul>
            )}
            <Link href="/crm/contractors" className="mt-3 inline-block text-sm font-bold text-teal-700 hover:text-teal-800">
              View imported contractors →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
