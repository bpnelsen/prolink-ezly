import { NextRequest, NextResponse } from 'next/server';
import { sendSmsNotification } from '../../../lib/twilio-service';

export async function POST(req: NextRequest) {
  const { proName, jobName, confirmLink, customerPhone } = await req.json();
  
  const message = `Prolink Update: ${proName} has requested a site visit for your ${jobName} request. Click here to confirm: ${confirmLink}`;
  
  const result = await sendSmsNotification(customerPhone || process.env.CUSTOMER_PHONE_TEST, message);
  
  return NextResponse.json({ success: result.success, sid: result.sid });
}
