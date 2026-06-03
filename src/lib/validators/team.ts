import { z } from "zod";

export const teamCreateSchema = z.object({
  shortName: z.string().trim().min(2).max(20),
  countryCode: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2}(?:-[a-z]+)?$/i)
    .transform((value) => value.toLowerCase()),
  group: z.string().trim().max(10).optional().or(z.literal("")),
});

export const teamUpdateSchema = teamCreateSchema.partial();
