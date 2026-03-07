import { logger, task } from "@trigger.dev/sdk";

import { sendBookingEmail } from "@/lib/email/resend";
import { sendSmsReminder } from "@/lib/messaging/twilio";

export const sendAppointmentReminder = task({
  id: "send-appointment-reminder",
  run: async (payload: { appointmentId: string; email?: string; phone?: string; message: string }) => {
    logger.info("Sending reminder", { appointmentId: payload.appointmentId });

    if (payload.email) {
      await sendBookingEmail({
        to: payload.email,
        subject: "Appointment reminder",
        html: `<p>${payload.message}</p>`,
      });
    }

    if (payload.phone) {
      await sendSmsReminder(payload.phone, payload.message);
    }

    return { ok: true };
  },
});
