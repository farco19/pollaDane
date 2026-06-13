import { getMatchesForUser } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { syncExternalLiveMatchesIfNeeded } from "@/lib/server/live-sync";
import { requireSessionUser } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await syncExternalLiveMatchesIfNeeded();
    const matches = await getMatchesForUser(user.id);
    return ok(matches);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar los partidos", 401);
  }
}
