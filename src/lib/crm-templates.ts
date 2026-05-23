import type { ImportedContractor } from './crm-types'

export type TemplateKind = 'email' | 'dm'

export type CRMTemplate = {
  id: string
  kind: TemplateKind
  name: string
  subject: string | null
  body: string
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export type RenderContext = {
  contractor: ImportedContractor
  sender_name?: string | null
  sender_email?: string | null
}

const VAR_KEYS = [
  'business_name', 'phone', 'email', 'address',
  'city', 'state', 'zip', 'website',
  'license_number', 'license_status', 'contact_status', 'source',
  'my_name', 'my_email', 'today',
] as const

export type TemplateVar = typeof VAR_KEYS[number]
export const TEMPLATE_VARS: ReadonlyArray<TemplateVar> = VAR_KEYS

export function buildVars(ctx: RenderContext): Record<TemplateVar, string> {
  const c = ctx.contractor
  const senderName = (ctx.sender_name || ctx.sender_email || '').split('@')[0] || ''
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  return {
    business_name:   c.business_name   || '',
    phone:           c.phone           || '',
    email:           c.email           || '',
    address:         c.address         || '',
    city:            c.city            || '',
    state:           c.state           || '',
    zip:             c.zip             || '',
    website:         c.website         || '',
    license_number:  c.license_number  || '',
    license_status:  c.license_status  || '',
    contact_status:  c.contact_status  || '',
    source:          c.source          || '',
    my_name:         senderName,
    my_email:        ctx.sender_email  || '',
    today,
  }
}

// {{var}} substitution. Unknown vars are left as-is so the user sees the
// placeholder and can fix the template, rather than silently sending blanks.
export function renderTemplate(text: string, vars: Record<string, string>): string {
  if (!text) return ''
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : full
  })
}
