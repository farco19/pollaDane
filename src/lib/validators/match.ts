import { z } from "zod";
import { parseColombiaDateTimeLocal } from "@/lib/match-datetime";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id invalido");

const matchBaseSchema = z.object({
  homeTeamId: objectIdSchema,
  awayTeamId: objectIdSchema,
  stage: z.enum(["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"]),
  group: z.string().trim().max(10).optional().or(z.literal("")),
  stadium: z.string().trim().min(2).max(120),
  matchDate: z.string().trim().transform((value, ctx) => {
    const parsed = parseColombiaDateTimeLocal(value);

    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha y hora invalidas",
      });
      return z.NEVER;
    }

    return parsed;
  }),
  status: z.enum(["scheduled", "live", "finished"]).default("scheduled"),
});

export const matchCreateSchema = matchBaseSchema.refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "El equipo local y visitante no pueden ser iguales",
    path: ["awayTeamId"],
  });

export const matchUpdateSchema = matchBaseSchema.partial();
