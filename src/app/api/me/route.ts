import { bootstrapDataLayer, getPublicSettings } from "@/lib/server/data";
import { getSessionUser } from "@/lib/server/session";
import { fail, ok } from "@/lib/server/api";

export async function GET() {
  try {
    await bootstrapDataLayer();
    const user = await getSessionUser();

    if (!user) {
      return fail("No autenticado", 401);
    }

    const settings = await getPublicSettings();
    return ok({ user, settings });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar la sesion", 500);
  }
}
