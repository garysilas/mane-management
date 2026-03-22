import { generateTimeSlots, getBarberAvailabilityForDate, type AppointmentWindow } from "@/lib/scheduling/engine";
import type { AvailabilityRuleInput, GeneratedSlot, TimeOffWindow } from "@/lib/scheduling/engine";

export type { AvailabilityRuleInput, GeneratedSlot, TimeOffWindow };

export { generateTimeSlots, getBarberAvailabilityForDate };

export function generateAvailableSlots(params: {
  date: Date | string;
  timeZone?: string;
  slotDurationMinutes: number;
  rules: AvailabilityRuleInput[];
  appointments: AppointmentWindow[];
  timeOffBlocks: TimeOffWindow[];
  slotIntervalMinutes?: number;
}): GeneratedSlot[] {
  const { date, timeZone, slotDurationMinutes, rules, appointments, timeOffBlocks, slotIntervalMinutes = 15 } = params;

  return generateTimeSlots({
    availabilityRules: rules,
    appointments,
    serviceDurationMinutes: slotDurationMinutes,
    date,
    timeZone,
    slotIntervalMinutes,
    timeOffBlocks,
  });
}
