import { z } from "zod";

export const registerSchema = z
  .object({
    inviteCode: z.string().trim().min(6).max(50),
    name: z.string().trim().min(3).max(80),
    email: z.email().trim().toLowerCase(),
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/[A-Z]/, "Debe incluir una mayuscula")
      .regex(/[a-z]/, "Debe incluir una minuscula")
      .regex(/[0-9]/, "Debe incluir un numero"),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(100),
});
