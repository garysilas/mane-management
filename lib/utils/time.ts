export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time string. Expected HH:mm format.");
  }

  return hours * 60 + minutes;
}

const dateTimePartFormatters = new Map<string, Intl.DateTimeFormat>();
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

type TimeZoneDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type LocalDateParts = Pick<TimeZoneDateParts, "year" | "month" | "day">;

function getDateTimePartFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateTimePartFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  dateTimePartFormatters.set(timeZone, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  offsetFormatters.set(timeZone, formatter);
  return formatter;
}

function parseLocalDate(localDate: string): LocalDateParts {
  const match = localDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Invalid local date string. Expected YYYY-MM-DD format.");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatLocalDate(parts: LocalDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseOffsetToMinutes(offset: string): number {
  if (offset === "GMT") {
    return 0;
  }

  const match = offset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset format: ${offset}`);
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

export function getTimeZoneDateParts(date: Date, timeZone: string): TimeZoneDateParts {
  const values = getDateTimePartFormatter(timeZone)
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }

      return parts;
    }, {});

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const offsetValue = getOffsetFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetValue) {
    throw new Error(`Unable to resolve timezone offset for ${timeZone}.`);
  }

  return parseOffsetToMinutes(offsetValue);
}

function addDaysToLocalDate(localDate: string, days: number): string {
  const parts = parseLocalDate(localDate);
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return formatLocalDate({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  });
}

function getLocalDateTimeDifferenceMinutes(
  date: Date,
  targetDate: LocalDateParts,
  targetHour: number,
  targetMinute: number,
  timeZone: string,
): number {
  const actual = getTimeZoneDateParts(date, timeZone);
  const actualUtcMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, 0);
  const targetUtcMs = Date.UTC(
    targetDate.year,
    targetDate.month - 1,
    targetDate.day,
    targetHour,
    targetMinute,
    0,
    0,
  );

  return Math.round((targetUtcMs - actualUtcMs) / 60_000);
}

export function combineLocalDateAndMinutes(localDate: string, minutesFromMidnight: number, timeZone: string): Date {
  const targetDate = parseLocalDate(localDate);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const targetUtcMs = Date.UTC(targetDate.year, targetDate.month - 1, targetDate.day, hours, minutes, 0, 0);

  let candidate = new Date(targetUtcMs - getTimeZoneOffsetMinutes(new Date(targetUtcMs), timeZone) * 60_000);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const differenceMinutes = getLocalDateTimeDifferenceMinutes(candidate, targetDate, hours, minutes, timeZone);

    if (differenceMinutes === 0) {
      return candidate;
    }

    candidate = new Date(candidate.getTime() + differenceMinutes * 60_000);
  }

  return candidate;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function getDateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = getTimeZoneDateParts(date, timeZone);

  return formatLocalDate(parts);
}

export function getCurrentDateInTimeZone(timeZone: string, now: Date = new Date()): string {
  return getDateStringInTimeZone(now, timeZone);
}

export function getDayOfWeekFromDateString(localDate: string): number {
  const parts = parseLocalDate(localDate);

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)).getUTCDay();
}

export function startOfTimeZoneDay(localDate: string, timeZone: string): Date {
  return combineLocalDateAndMinutes(localDate, 0, timeZone);
}

export function endOfTimeZoneDay(localDate: string, timeZone: string): Date {
  return startOfTimeZoneDay(addDaysToLocalDate(localDate, 1), timeZone);
}

export function getMinutesFromTimeZoneMidnight(date: Date, timeZone: string): number {
  const parts = getTimeZoneDateParts(date, timeZone);

  return parts.hour * 60 + parts.minute;
}

function normalizeDateValue(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatTimeInTimeZone(value: Date | string, timeZone: string): string {
  const date = normalizeDateValue(value);

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

export function formatDateTimeInTimeZone(value: Date | string, timeZone: string): string {
  const date = normalizeDateValue(value);

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}
