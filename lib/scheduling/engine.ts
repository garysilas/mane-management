import { AppointmentStatus } from "@prisma/client";

import {
  addMinutes,
  combineLocalDateAndMinutes,
  endOfTimeZoneDay,
  getDateStringInTimeZone,
  getDayOfWeekFromDateString,
  getMinutesFromTimeZoneMidnight,
  parseTimeToMinutes,
  startOfTimeZoneDay,
} from "@/lib/utils/time";

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
  date: Date | string;
  timeZone?: string;
  slotIntervalMinutes?: number;
  slotInterval?: number;
  timeOffBlocks?: TimeOffWindow[];
};

type GetAvailabilityInput = {
  date: Date | string;
  timeZone?: string;
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

function resolveLocalDate(date: Date | string, timeZone: string): string {
  return typeof date === "string" ? date : getDateStringInTimeZone(date, timeZone);
}

export function getBarberAvailabilityForDate(params: GetAvailabilityInput): TimeWindow[] {
  const { date } = params;
  const timeZone = params.timeZone ?? "UTC";
  const availabilityRules = params.availabilityRules ?? params.weeklyAvailabilityRules ?? params.rules ?? [];
  const timeOffBlocks = params.timeOffBlocks ?? [];
  const localDate = resolveLocalDate(date, timeZone);
  const dayOfWeek = getDayOfWeekFromDateString(localDate);
  const dayStart = startOfTimeZoneDay(localDate, timeZone);
  const dayEnd = endOfTimeZoneDay(localDate, timeZone);

  const dailyAvailability = availabilityRules
    .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
    .map((rule) => {
      const startMinutes = parseTimeToMinutes(rule.startTimeLocal);
      const endMinutes = parseTimeToMinutes(rule.endTimeLocal);

      return {
        startTime: combineLocalDateAndMinutes(localDate, startMinutes, timeZone),
        endTime: combineLocalDateAndMinutes(localDate, endMinutes, timeZone),
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
  const timeZone = params.timeZone ?? "UTC";
  const availabilityRules = params.availabilityRules ?? params.weeklyAvailabilityRules ?? params.rules ?? [];
  const appointments = params.appointments ?? params.existingAppointments ?? [];
  const serviceDurationMinutes =
    params.serviceDurationMinutes ?? params.serviceDuration ?? params.slotDurationMinutes ?? 0;
  const slotIntervalMinutes = params.slotIntervalMinutes ?? params.slotInterval ?? 15;
  const timeOffBlocks = params.timeOffBlocks ?? [];
  const localDate = resolveLocalDate(date, timeZone);

  if (serviceDurationMinutes <= 0 || slotIntervalMinutes <= 0) {
    return [];
  }

  const availabilityWindows = getBarberAvailabilityForDate({
    date: localDate,
    timeZone,
    availabilityRules,
    timeOffBlocks,
  });

  const slots: GeneratedSlot[] = [];

  for (const availabilityWindow of availabilityWindows) {
    const startMinutes = roundUpToInterval(
      getMinutesFromTimeZoneMidnight(availabilityWindow.startTime, timeZone),
      slotIntervalMinutes,
    );
    const endMinutes = getMinutesFromTimeZoneMidnight(availabilityWindow.endTime, timeZone);

    for (
      let slotStartMinutes = startMinutes;
      slotStartMinutes + serviceDurationMinutes <= endMinutes;
      slotStartMinutes += slotIntervalMinutes
    ) {
      const slotStartTime = combineLocalDateAndMinutes(localDate, slotStartMinutes, timeZone);
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
