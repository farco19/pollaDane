import { z } from "zod";

export const settingsUpdateSchema = z.object({
  entryFee: z.number().int().min(1000).max(100000000),
  currency: z.literal("COP").default("COP"),
  predictionCutoffMode: z.enum(["match_start", "first_match_start"]).default("first_match_start"),
  matchScoring: z.object({
    exactScorePoints: z.number().int().min(0).max(500),
    winnerPoints: z.number().int().min(0).max(500),
    drawPoints: z.number().int().min(0).max(500),
    lossPoints: z.number().int().min(0).max(500),
  }),
  anticipationScoring: z.object({
    groupQualifiedPoints: z.number().int().min(0).max(500),
    bestThirdPoints: z.number().int().min(0).max(500),
    roundOf16Points: z.number().int().min(0).max(500),
    quarterFinalPoints: z.number().int().min(0).max(500),
    semiFinalPoints: z.number().int().min(0).max(500),
    finalPoints: z.number().int().min(0).max(500),
    championPoints: z.number().int().min(0).max(500),
  }),
});
