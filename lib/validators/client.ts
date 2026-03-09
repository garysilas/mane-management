import { z } from "zod";

export const clientIdSchema = z.object({
  id: z.string().cuid("Invalid client id."),
});

export const clientNoteSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});

export type ClientNoteInput = z.infer<typeof clientNoteSchema>;
