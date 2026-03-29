import { sendSmsNotification } from './lib/twilio-service';

async function testTwilio() {
  const recipient = '+15550109999'; // Replace with your actual number for the test
  const message = 'Prolink-Ezly Test: SMS Service is operational.';
  console.log('Sending test SMS to', recipient);
  const result = await sendSmsNotification(recipient, message);
  console.log('Result:', result);
}

testTwilio().catch(console.error);