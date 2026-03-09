import { AppointmentStatus } from "@prisma/client";

import { addMinutes, combineUtcDateAndMinutes, parseTimeToMinutes, startOfUtcDay } from "@/lib/utils/time";

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type TimeWindow = {
  startTime: Date;
  endTime: Date;
};

export type TimeOffWindow = TimeWindow;

export type AppointmentWindow = TimeWindow & {
  status?: AppointmentStatus;
};

export type GeneratedSlot = TimeWindow;

type GenerateTimeSlotsInput = {
  availabilityRules?: AvailabilityRuleInput[];
  weeklyAvailabilityRules?: AvailabilityRuleInput[];
  rules?: AvailabilityRuleInput[];
  appointments?: AppointmentWindow[];
  existingAppointments?: AppointmentWindow[];
  serviceDurationMinutes?: number;
  serviceDuration?: number;
  slotDurationMinutes?: number;
  date: Date;
  slotIntervalMinutes?: number;
  slotInterval?: number;
  timeOffBlocks?: TimeOffWindow[];
};

type GetAvailabilityInput = {
  date: Date;
  availabilityRules?: AvailabilityRuleInput[];
  weeklyAvailabilityRules?: AvailabilityRuleInput[];
  rules?: AvailabilityRuleInput[];
  timeOffBlocks?: TimeOffWindow[];
};

type IsTimeSlotAvailableInput = {
  proposedStartTime: Date;
  proposedEndTime?: Date;
  serviceDurationMinutes?: number;
  appointments?: AppointmentWindow[];
  existingAppointments?: AppointmentWindow[];
};

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function isValidWindow(window: TimeWindow): boolean {
  return window.startTime < window.endTime;
}

function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length === 0) {
    return [];
  }

  const sorted = [...windows].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const merged: TimeWindow[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.startTime <= previous.endTime) {
      if (current.endTime > previous.endTime) {
        previous.endTime = current.endTime;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function subtractWindow(baseWindow: TimeWindow, blockedWindow: TimeWindow): TimeWindow[] {
  if (!overlaps(baseWindow.startTime, baseWindow.endTime, blockedWindow.startTime, blockedWindow.endTime)) {
    return [baseWindow];
  }

  const windows: TimeWindow[] = [];

  if (blockedWindow.startTime > baseWindow.startTime) {
    windows.push({
      startTime: baseWindow.startTime,
      endTime: blockedWindow.startTime,
    });
  }

  if (blockedWindow.endTime < baseWindow.endTime) {
    windows.push({
      startTime: blockedWindow.endTime,
      endTime: baseWindow.endTime,
    });
  }

  return windows.filter(isValidWindow);
}

function clampToDay(window: TimeWindow, dayStart: Date, dayEnd: Date): TimeWindow | null {
  const startTime = window.startTime > dayStart ? window.startTime : dayStart;
  const endTime = window.endTime < dayEnd ? window.endTime : dayEnd;

  if (startTime >= endTime) {
    return null;
  }

  return { startTime, endTime };
}

function getMinutesFromUtcMidnight(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function roundUpToInterval(minutes: number, intervalMinutes: number): number {
  if (intervalMinutes <= 0) {
    return minutes;
  }

  const remainder = minutes % intervalMinutes;
  return remainder === 0 ? minutes : minutes + intervalMinutes - remainder;
}

function isBlockingAppointment(appointment: AppointmentWindow): boolean {
  return appointment.status !== AppointmentStatus.CANCELLED;
}

export function isTimeSlotAvailable(params: IsTimeSlotAvailableInput): boolean;
export function isTimeSlotAvailable(
  proposedStartTime: Date,
  proposedEndTimeOrDuration: Date | number,
  appointments: AppointmentWindow[],
): boolean;
export function isTimeSlotAvailable(
  paramsOrProposedStartTime: IsTimeSlotAvailableInput | Date,
  proposedEndTimeOrDuration?: Date | number,
  appointmentsFromArgs?: AppointmentWindow[],
): boolean {
  let proposedStartTime: Date;
  let proposedEndTime: Date | null;
  let appointments: AppointmentWindow[];

  if (paramsOrProposedStartTime instanceof Date) {
    proposedStartTime = paramsOrProposedStartTime;
    appointments = appointmentsFromArgs ?? [];
    proposedEndTime =
      proposedEndTimeOrDuration instanceof Date
        ? proposedEndTimeOrDuration
        : typeof proposedEndTimeOrDuration === "number"
          ? addMinutes(proposedStartTime, proposedEndTimeOrDuration)
          : null;
  } else {
    proposedStartTime = paramsOrProposedStartTime.proposedStartTime;
    appointments = paramsOrProposedStartTime.appointments ?? paramsOrProposedStartTime.existingAppointments ?? [];
    proposedEndTime =
      paramsOrProposedStartTime.proposedEndTime ??
      (typeof paramsOrProposedStartTime.serviceDurationMinutes === "number"
        ? addMinutes(proposedStartTime, paramsOrProposedStartTime.serviceDurationMinutes)
        : null);
  }

  if (!proposedEndTime || proposedEndTime <= proposedStartTime) {
    return false;
  }

  return appointments.every((appointment) => {
    if (!isBlockingAppointment(appointment)) {
      return true;
    }

    return !overlaps(appointment.startTime, appointment.endTime, proposedStartTime, proposedEndTime);
  });
}

export function getBarberAvailabilityForDate(params: GetAvailabilityInput): TimeWindow[] {
  const { date } = params;
  const availabilityRules = params.availabilityRules ?? params.weeklyAvailabilityRules ?? params.rules ?? [];
  const timeOffBlocks = params.timeOffBlocks ?? [];
  const dayOfWeek = date.getUTCDay();
  const dayStart = startOfUtcDay(date);
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const dailyAvailability = availabilityRules
    .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
    .map((rule) => {
      const startMinutes = parseTimeToMinutes(rule.startTimeLocal);
      const endMinutes = parseTimeToMinutes(rule.endTimeLocal);

      return {
        startTime: combineUtcDateAndMinutes(date, startMinutes),
        endTime: combineUtcDateAndMinutes(date, endMinutes),
      };
    })
    .filter(isValidWindow);

  if (dailyAvailability.length === 0) {
    return [];
  }

  const mergedAvailability = mergeWindows(dailyAvailability);

  const mergedTimeOff = mergeWindows(
    timeOffBlocks
      .map((block) => clampToDay(block, dayStart, dayEnd))
      .filter((block): block is TimeWindow => block !== null),
  );

  if (mergedTimeOff.length === 0) {
    return mergedAvailability;
  }

  const workingWindows: TimeWindow[] = [];

  for (const availabilityWindow of mergedAvailability) {
    let segments: TimeWindow[] = [availabilityWindow];

    for (const blockedWindow of mergedTimeOff) {
      segments = segments.flatMap((segment) => subtractWindow(segment, blockedWindow));

      if (segments.length === 0) {
        break;
      }
    }

    workingWindows.push(...segments);
  }

  return mergeWindows(workingWindows);
}

export function generateTimeSlots(params: GenerateTimeSlotsInput): GeneratedSlot[] {
  const { date } = params;
  const availabilityRules = params.availabilityRules ?? params.weeklyAvailabilityRules ?? params.rules ?? [];
  const appointments = params.appointments ?? params.existingAppointments ?? [];
  const serviceDurationMinutes =
    params.serviceDurationMinutes ?? params.serviceDuration ?? params.slotDurationMinutes ?? 0;
  const slotIntervalMinutes = params.slotIntervalMinutes ?? params.slotInterval ?? 15;
  const timeOffBlocks = params.timeOffBlocks ?? [];

  if (serviceDurationMinutes <= 0 || slotIntervalMinutes <= 0) {
    return [];
  }

  const availabilityWindows = getBarberAvailabilityForDate({
    date,
    availabilityRules,
    timeOffBlocks,
  });

  const slots: GeneratedSlot[] = [];

  for (const availabilityWindow of availabilityWindows) {
    const startMinutes = roundUpToInterval(getMinutesFromUtcMidnight(availabilityWindow.startTime), slotIntervalMinutes);
    const endMinutes = getMinutesFromUtcMidnight(availabilityWindow.endTime);

    for (
      let slotStartMinutes = startMinutes;
      slotStartMinutes + serviceDurationMinutes <= endMinutes;
      slotStartMinutes += slotIntervalMinutes
    ) {
      const slotStartTime = combineUtcDateAndMinutes(date, slotStartMinutes);
      const slotEndTime = addMinutes(slotStartTime, serviceDurationMinutes);

      if (
        isTimeSlotAvailable({
          proposedStartTime: slotStartTime,
          proposedEndTime: slotEndTime,
          appointments,
        })
      ) {
        slots.push({ startTime: slotStartTime, endTime: slotEndTime });
      }
    }
  }

  return slots;
}
