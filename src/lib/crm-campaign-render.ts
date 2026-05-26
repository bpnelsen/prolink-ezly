// Shared rendering helpers for mass-email campaigns. Wraps the per-contractor
// body with the legally-required CAN-SPAM footer (physical address +
// per-recipient unsubscribe link) before handing it to Resend.

import { buildVars, renderTemplate } from './crm-templates'
import type { ImportedContractor } from './crm-types'

export function siteBaseUrl(): string {
  // Always full URL; the unsubscribe link needs to work from any inbox.
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.useezly.com').replace(/\/$/, '')
}

export function physicalAddress(): string {
  // Required in every cold-outreach email under CAN-SPAM. We refuse to send
  // unless this is set; the empty default keeps the renderer safe.
  return process.env.CRM_PHYSICAL_ADDRESS || ''
}

export function unsubscribeUrl(token: string): string {
  return `${siteBaseUrl()}/unsubscribe/${token}`
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function bodyToHtml(text: string): string {
  const escaped = escapeHtml(text)
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0F3A7D;">$1</a>',
  )
  return linked.replace(/\n/g, '<br/>')
}

type RenderedEmail = {
  subject: string
  bodyText: string
  bodyHtml: string
}

// Render subject + body for one recipient, including the compliance footer.
export function renderForRecipient(args: {
  contractor: ImportedContractor
  subject: string
  body: string
  senderName: string | null
  senderEmail: string | null
  unsubscribeToken: string
}): RenderedEmail {
  const vars = buildVars({
    contractor: args.contractor,
    sender_name: args.senderName,
    sender_email: args.senderEmail,
  })
  const subject = renderTemplate(args.subject, vars)
  const renderedBody = renderTemplate(args.body, vars)

  const unsubUrl = unsubscribeUrl(args.unsubscribeToken)
  const address = physicalAddress()

  const footerText =
    `\n\n—\nDon't want these emails? Unsubscribe: ${unsubUrl}\n${address}`

  const bodyText = renderedBody + footerText

  const footerHtml =
    `<hr style="margin:24px 0 12px 0;border:0;border-top:1px solid #e5e7eb;"/>` +
    `<p style="font-size:11px;color:#6b7280;line-height:1.6;margin:0;">` +
    `<a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>` +
    ` &middot; ${escapeHtml(address)}` +
    `</p>`

  const bodyHtml = bodyToHtml(renderedBody) + footerHtml

  return { subject, bodyText, bodyHtml }
}
