const mocks = vi.hoisted(() => ({
  barberFindUnique: vi.fn(),
  createAppointment: vi.fn(),
  sendBookingEmail: vi.fn(),
  sendSmsReminder: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    barber: {
      findUnique: mocks.barberFindUnique,
    },
  },
}));

vi.mock("@/lib/scheduling/appointments", () => ({
  createAppointment: mocks.createAppointment,
}));

vi.mock("@/lib/email/resend", () => ({
  sendBookingEmail: mocks.sendBookingEmail,
}));

vi.mock("@/lib/messaging/twilio", () => ({
  sendSmsReminder: mocks.sendSmsReminder,
}));

import { AppointmentStatus, BookingSource } from "@prisma/client";

import { createConfirmedBooking } from "@/lib/bookings/create-booking";
import { formatDateTimeInTimeZone } from "@/lib/utils/time";

describe("create confirmed booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendBookingEmail.mockResolvedValue(undefined);
    mocks.sendSmsReminder.mockResolvedValue(undefined);
  });

  it("uses the updated business name and timezone in booking confirmations", async () => {
    const barber = {
      id: "barber-1",
      name: "Jay",
      businessName: "Jay Fades Studio",
      timezone: "America/Los_Angeles",
    };
    const appointment = {
      id: "appointment-1",
      status: AppointmentStatus.BOOKED,
      startTime: new Date("2026-03-11T15:00:00.000Z"),
      endTime: new Date("2026-03-11T15:30:00.000Z"),
    };
    const input = {
      serviceId: "service-1",
      startTime: "2026-03-11T15:00:00.000Z",
      name: "Alex Client",
      email: "alex@example.com",
      phone: "+15555550100",
      notes: "Prefers a taper",
    };

    mocks.createAppointment.mockResolvedValue(appointment);

    const result = await createConfirmedBooking(barber, input);
    const expectedDateTime = formatDateTimeInTimeZone(appointment.startTime, barber.timezone);

    expect(mocks.createAppointment).toHaveBeenCalledWith({
      barberId: barber.id,
      serviceId: input.serviceId,
      startTime: new Date(input.startTime),
      bookingSource: BookingSource.PUBLIC_PAGE,
      notes: input.notes,
      client: {
        name: input.name,
        email: input.email,
        phone: input.phone,
      },
    });

    expect(mocks.sendBookingEmail).toHaveBeenCalledWith({
      to: input.email,
      subject: "Booking confirmed with Jay Fades Studio",
      html: `<p>Your appointment is booked for ${expectedDateTime} (${barber.timezone}).</p>`,
    });

    expect(mocks.sendSmsReminder).toHaveBeenCalledWith(input.phone, "Booking confirmed with Jay Fades Studio.");

    expect(result).toEqual({
      id: appointment.id,
      status: appointment.status,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
    });
  });
});
