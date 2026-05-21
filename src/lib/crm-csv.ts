// Minimal CSV parser. Handles quoted fields, escaped quotes (""), CRLF.
// We control the input shape (admin-only upload) so this stays small.

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  while (i < text.length) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }

    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') {
      row.push(field); rows.push(row)
      row = []; field = ''; i++; continue
    }
    field += c; i++
  }
  // Flush trailing field/row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(cell => cell.length > 0))
}

export const CSV_COLUMNS = [
  'business_name', 'phone', 'email', 'address', 'city', 'state', 'zip',
  'website', 'license_number', 'license_status', 'source', 'contact_status',
  'notes',
] as const
export type CSVColumn = typeof CSV_COLUMNS[number]
