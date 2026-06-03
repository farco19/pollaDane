import { z } from "zod";

export const inviteCodeCreateSchema = z.object({
  quantity: z.number().int().min(1).max(500),
  prefix: z.string().trim().min(2).max(10).optional(),
});

export const inviteCodeStatusSchema = z.object({
  status: z.enum(["available", "used", "disabled"]),
});
