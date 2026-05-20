/**
 * Branded HTML email for the customer-portal invite.
 *
 * Uses table-based layout + inline styles so it renders correctly in Gmail,
 * Outlook, Apple Mail, and webmail clients. No external assets — the logo is
 * rendered as styled text so it never breaks when images are blocked.
 */
export function portalInviteHtml(opts: {
  name: string
  claimUrl: string
  contractorName?: string
}): string {
  const { name, claimUrl, contractorName } = opts
  const fromLine = contractorName
    ? `${escapeHtml(contractorName)} has invited you to your Prolink customer portal.`
    : `You've been invited to your Prolink customer portal.`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your Prolink customer portal</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">View invoices, messages, and contracts in your Prolink customer portal.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <tr><td style="background:linear-gradient(135deg,#0f3a7d 0%,#14b8a6 100%);padding:28px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
              Prolink
            </td>
            <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">
              Customer Portal
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 32px 8px 32px;">
          <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;font-weight:700;color:#0f172a;">Hi ${escapeHtml(name)},</h1>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:#334155;">${fromLine}</p>
          <p style="margin:0 0 28px 0;font-size:16px;line-height:1.55;color:#334155;">Sign in to view your invoices, messages, contracts, and project updates &mdash; all in one place.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
            <tr><td style="border-radius:10px;background:#0f3a7d;">
              <a href="${escapeAttr(claimUrl)}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Open my portal &rarr;</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#64748b;">Or paste this link into your browser:</p>
          <p style="margin:0 0 28px 0;font-size:13px;line-height:1.45;color:#0f3a7d;word-break:break-all;"><a href="${escapeAttr(claimUrl)}" style="color:#0f3a7d;text-decoration:underline;">${escapeHtml(claimUrl)}</a></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;border-top:1px solid #e2e8f0;"><tr><td style="padding-top:20px;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">This link is unique to you &mdash; please don't share it. If you weren't expecting this email, you can safely ignore it.</p>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px 28px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#0f3a7d;">Prolink</p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">The contractor platform &middot; Powered by Supabase</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function portalInviteText(opts: { name: string; claimUrl: string; contractorName?: string }): string {
  const { name, claimUrl, contractorName } = opts
  const from = contractorName
    ? `${contractorName} has invited you to your Prolink customer portal.`
    : `You've been invited to your Prolink customer portal.`
  return `Hi ${name},

${from}

Sign in to view your invoices, messages, contracts, and project updates — all in one place.

Open your portal: ${claimUrl}

This link is unique to you — please don't share it. If you weren't expecting this email, you can safely ignore it.

— Prolink`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
