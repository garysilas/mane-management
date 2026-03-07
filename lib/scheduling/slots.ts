import { AppointmentStatus } from "@prisma/client";

import { hasAppointmentConflict, overlaps, type AppointmentWindow } from "@/lib/scheduling/conflicts";
import { addMinutes, combineUtcDateAndMinutes, parseTimeToMinutes } from "@/lib/utils/time";

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type TimeOffWindow = {
  startTime: Date;
  endTime: Date;
};

export type GeneratedSlot = {
  startTime: Date;
  endTime: Date;
};

export function generateAvailableSlots(params: {
  date: Date;
  slotDurationMinutes: number;
  rules: AvailabilityRuleInput[];
  appointments: AppointmentWindow[];
  timeOffBlocks: TimeOffWindow[];
  slotIntervalMinutes?: number;
}): GeneratedSlot[] {
  const {
    date,
    slotDurationMinutes,
    rules,
    appointments,
    timeOffBlocks,
    slotIntervalMinutes = 15,
  } = params;

  const dayOfWeek = date.getUTCDay();
  const activeRules = rules.filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek);

  const busyAppointments = appointments.filter(
    (appointment) => !appointment.status || appointment.status === AppointmentStatus.BOOKED,
  );

  const slots: GeneratedSlot[] = [];

  for (const rule of activeRules) {
    const startMinutes = parseTimeToMinutes(rule.startTimeLocal);
    const endMinutes = parseTimeToMinutes(rule.endTimeLocal);

    for (let current = startMinutes; current + slotDurationMinutes <= endMinutes; current += slotIntervalMinutes) {
      const slotStart = combineUtcDateAndMinutes(date, current);
      const slotEnd = addMinutes(slotStart, slotDurationMinutes);

      const appointmentConflict = hasAppointmentConflict(busyAppointments, slotStart, slotEnd);
      if (appointmentConflict) {
        continue;
      }

      const timeOffConflict = timeOffBlocks.some((block) => overlaps(block.startTime, block.endTime, slotStart, slotEnd));
      if (timeOffConflict) {
        continue;
      }

      slots.push({ startTime: slotStart, endTime: slotEnd });
    }
  }

  return slots;
}
