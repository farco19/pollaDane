import { getParticipantDashboard } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { syncExternalLiveMatchesIfNeeded } from "@/lib/server/live-sync";
import { requireSessionUser } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await syncExternalLiveMatchesIfNeeded();
    const dashboard = await getParticipantDashboard(user.id);
    return ok(dashboard);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar el dashboard", 401);
  }
}
