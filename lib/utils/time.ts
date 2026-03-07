export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time string. Expected HH:mm format.");
  }

  return hours * 60 + minutes;
}

export function combineUtcDateAndMinutes(date: Date, minutesFromMidnight: number): Date {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();

  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;

  return new Date(Date.UTC(utcYear, utcMonth, utcDate, hours, minutes, 0, 0));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
