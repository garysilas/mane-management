import { z } from "zod";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function nullableTrimmedText(maxLength: number) {
  return z.string().trim().max(maxLength).transform((value) => value || null);
}

export const barberSettingsSchema = z.object({
  businessName: nullableTrimmedText(120),
  location: nullableTrimmedText(200),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(120)
    .refine(isValidTimeZone, "Invalid timezone."),
  bookingPolicy: nullableTrimmedText(1000),
});

export type BarberSettingsInput = z.infer<typeof barberSettingsSchema>;
