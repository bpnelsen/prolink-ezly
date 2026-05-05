import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { proName, jobName, confirmLink } = await req.json()

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_PHONE_NUMBER
    const toPhone = process.env.NOTIFY_PHONE_NUMBER

    if (!accountSid || !authToken || !fromPhone || !toPhone) {
      console.warn('Twilio not configured — site visit notification skipped')
      return NextResponse.json({ success: false, reason: 'Twilio not configured' })
    }

    const { Twilio } = await import('twilio')
    const client = new Twilio(accountSid, authToken)

    const message = `Prolink: ${proName} has requested a site visit for "${jobName}". Confirm here: ${confirmLink}`

    await client.messages.create({ body: message, from: fromPhone, to: toPhone })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('notify-site-visit error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
