import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id invalido");

const matchBaseSchema = z.object({
  homeTeamId: objectIdSchema,
  awayTeamId: objectIdSchema,
  stage: z.enum(["group", "round_of_16", "quarter_final", "semi_final", "third_place", "final"]),
  group: z.string().trim().max(10).optional().or(z.literal("")),
  stadium: z.string().trim().min(2).max(120),
  matchDate: z.coerce.date(),
  status: z.enum(["scheduled", "live", "finished"]).default("scheduled"),
});

export const matchCreateSchema = matchBaseSchema.refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "El equipo local y visitante no pueden ser iguales",
    path: ["awayTeamId"],
  });

export const matchUpdateSchema = matchBaseSchema.partial();
