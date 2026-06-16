import { z } from "zod";
import { anticipationStageLimits } from "@/lib/anticipation";

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
    bestThirdTeamIds: teamIdArraySchema.max(anticipationStageLimits.bestThirdTeamIds),
    roundOf32TeamIds: teamIdArraySchema.max(anticipationStageLimits.roundOf32TeamIds),
    roundOf16TeamIds: teamIdArraySchema.max(anticipationStageLimits.roundOf16TeamIds),
    quarterFinalTeamIds: teamIdArraySchema.max(anticipationStageLimits.quarterFinalTeamIds),
    semiFinalTeamIds: teamIdArraySchema.max(anticipationStageLimits.semiFinalTeamIds),
    finalTeamIds: teamIdArraySchema.max(anticipationStageLimits.finalTeamIds),
    championTeamId: objectIdSchema.nullable(),
  }),
});
