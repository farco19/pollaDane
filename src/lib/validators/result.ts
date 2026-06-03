import { z } from "zod";

export const resultLoadSchema = z.object({
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  status: z.enum(["finished"]).default("finished"),
});
