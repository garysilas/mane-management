import { Resend } from "resend";

export async function sendBookingEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
