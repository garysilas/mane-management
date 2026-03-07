import twilio from "twilio";

export async function sendSmsReminder(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !from) {
    return;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({ to, from, body });
}
