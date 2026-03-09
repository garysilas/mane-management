import { generateTimeSlots, getBarberAvailabilityForDate, type AppointmentWindow } from "@/lib/scheduling/engine";
import type { AvailabilityRuleInput, GeneratedSlot, TimeOffWindow } from "@/lib/scheduling/engine";

export type { AvailabilityRuleInput, GeneratedSlot, TimeOffWindow };

export { generateTimeSlots, getBarberAvailabilityForDate };

export function generateAvailableSlots(params: {
  date: Date;
  slotDurationMinutes: number;
  rules: AvailabilityRuleInput[];
  appointments: AppointmentWindow[];
  timeOffBlocks: TimeOffWindow[];
  slotIntervalMinutes?: number;
}): GeneratedSlot[] {
  const { date, slotDurationMinutes, rules, appointments, timeOffBlocks, slotIntervalMinutes = 15 } = params;

  return generateTimeSlots({
    availabilityRules: rules,
    appointments,
    serviceDurationMinutes: slotDurationMinutes,
    date,
    slotIntervalMinutes,
    timeOffBlocks,
  });
}
