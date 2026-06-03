import { getParticipantDashboard } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireSessionUser } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const dashboard = await getParticipantDashboard(user.id);
    return ok(dashboard);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar el dashboard", 401);
  }
}
