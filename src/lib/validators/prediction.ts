import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id invalido");

export const predictionCreateSchema = z.object({
  matchId: objectIdSchema,
  predictedHomeScore: z.number().int().min(0).max(30),
  predictedAwayScore: z.number().int().min(0).max(30),
});
