import { z } from "zod";

const contactSchema = z
  .object({
    serviceId: z.string().cuid("Invalid service id.").nullable().optional(),
    clientName: z.string().trim().min(2, "Name is required.").max(120),
    email: z.string().trim().email("Invalid email.").max(255).nullable().optional(),
    phone: z.string().trim().min(7, "Phone is too short.").max(40).nullable().optional(),
    preferredDate: z.string().datetime("Preferred date must be a valid ISO date."),
    preferredWindow: z.string().trim().max(80).nullable().optional(),
  })
  .transform((value) => ({
    ...value,
    serviceId: value.serviceId || null,
    email: value.email || null,
    phone: value.phone || null,
    preferredWindow: value.preferredWindow || null,
  }))
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Email or phone is required.",
    path: ["email"],
  });

export const publicWaitlistRequestSchema = contactSchema;

export type PublicWaitlistRequestInput = z.infer<typeof publicWaitlistRequestSchema>;
