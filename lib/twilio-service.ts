const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? new Twilio.Twilio(accountSid, authToken) : null;

export async function sendSmsNotification(to: string, message: string) {
  if (!client || !fromPhone) {
    console.warn('Twilio not configured - SMS skipping');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: String(error) };
  }
}
