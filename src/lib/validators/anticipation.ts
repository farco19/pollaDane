import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id invalido");

const teamIdArraySchema = z.array(objectIdSchema).max(64).refine((items) => new Set(items).size === items.length, {
  message: "No se permiten equipos repetidos",
});

export const anticipationPredictionSchema = z.object({
  groupRankings: z.array(
    z
      .object({
        group: z.string().trim().min(1).max(10),
        firstTeamId: objectIdSchema.nullable(),
        secondTeamId: objectIdSchema.nullable(),
      })
      .refine((value) => value.firstTeamId !== value.secondTeamId, {
        message: "No puedes repetir el mismo equipo en el grupo",
        path: ["secondTeamId"],
      }),
  ),
  stageSelections: z.object({
    roundOf16TeamIds: teamIdArraySchema,
    quarterFinalTeamIds: teamIdArraySchema,
    semiFinalTeamIds: teamIdArraySchema,
    finalTeamIds: teamIdArraySchema,
    championTeamId: objectIdSchema.nullable(),
  }),
});
