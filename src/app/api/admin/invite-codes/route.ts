import { createCode } from "@/lib/utils";
import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { inviteCodeCreateSchema } from "@/lib/validators/invite-code";
import { InviteCode } from "@/models/InviteCode";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const codes = await InviteCode.find({}).sort({ createdAt: -1 }).lean();
    return ok(codes.map((code) => ({ _id: String(code._id), code: code.code, status: code.status, usedAt: code.usedAt ?? null })));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar codigos", 403);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = inviteCodeCreateSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Solicitud invalida", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const total = await InviteCode.countDocuments();
    const prefix = (parsed.data.prefix ?? "PAGO").toUpperCase();
    const docs = Array.from({ length: parsed.data.quantity }, (_, index) => ({ code: createCode(prefix, total + index + 1), status: "available" }));
    const created = await InviteCode.insertMany(docs, { ordered: false });
    return ok(created.map((code) => ({ _id: String(code._id), code: code.code, status: code.status })), "Codigos generados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible generar codigos", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();

    const json = await request.json().catch(() => ({}));
    const ids = Array.isArray(json.ids) ? json.ids.filter((value: unknown): value is string => typeof value === "string") : [];
    const deleteAll = json.deleteAll === true;

    if (!deleteAll && ids.length === 0) {
      return fail("Debes indicar los codigos a eliminar", 400);
    }

    const filter = deleteAll ? {} : { _id: { $in: ids } };
    const codes = await InviteCode.find(filter).lean();

    if (!codes.length) {
      return ok({ deletedCount: 0 }, "No habia codigos para eliminar");
    }

    const codeIds = codes.map((code) => code._id);

    await User.updateMany({ inviteCodeId: { $in: codeIds } }, { $set: { inviteCodeId: null } });

    const result = await InviteCode.deleteMany({ _id: { $in: codeIds } });
    return ok({ deletedCount: result.deletedCount ?? 0 }, "Codigos eliminados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible eliminar los codigos", 500);
  }
}
