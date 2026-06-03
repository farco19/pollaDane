import argon2 from "argon2";
import { registerSchema } from "@/lib/validators/auth";
import { InviteCode } from "@/models/InviteCode";
import { User } from "@/models/User";
import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Datos de registro invalidos", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const { inviteCode, name, email, password } = parsed.data;
    const normalizedCode = inviteCode.toUpperCase();
    const normalizedEmail = email.toLowerCase();

    const [existingUser, code] = await Promise.all([
      User.findOne({ email: normalizedEmail }).lean(),
      InviteCode.findOne({ code: normalizedCode }),
    ]);

    if (existingUser) {
      return fail("Ya existe un usuario registrado con este correo", 409, "EMAIL_EXISTS");
    }

    if (!code || code.status !== "available") {
      return fail("El codigo no existe, ya fue usado o esta deshabilitado", 400, "INVALID_CODE");
    }

    const passwordHash = await argon2.hash(password);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "participant",
      inviteCodeId: code._id,
      isActive: true,
    });

    code.status = "used";
    code.usedByUserId = user._id;
    code.assignedToEmail = normalizedEmail;
    code.usedAt = new Date();
    await code.save();

    return ok({ userId: String(user._id) }, "Registro exitoso");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible registrar el usuario", 500);
  }
}
