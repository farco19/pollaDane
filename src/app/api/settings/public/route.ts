import { getPublicSettings } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return ok(settings);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar la configuracion", 500);
  }
}
