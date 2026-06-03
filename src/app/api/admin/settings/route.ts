import { bootstrapDataLayer, recalculateScoredPredictions } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { settingsUpdateSchema } from "@/lib/validators/settings";
import { TournamentSettings } from "@/models/TournamentSettings";

export async function PATCH(request: Request) {
  try {
    const user = await requireAdminUser();
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = settingsUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Configuracion invalida", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const settings = await TournamentSettings.findOneAndUpdate({}, { ...parsed.data, updatedBy: user.id }, { new: true, upsert: true });
    await recalculateScoredPredictions();
    return ok(settings, "Configuracion actualizada");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible actualizar la configuracion", 500);
  }
}
