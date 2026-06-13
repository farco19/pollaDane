import { bootstrapDataLayer } from "@/lib/server/data";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { fail, ok } from "@/lib/server/api";
import { syncExternalLiveMatchesIfNeeded } from "@/lib/server/live-sync";

export async function GET() {
  try {
    await bootstrapDataLayer();
    await syncExternalLiveMatchesIfNeeded();
    const leaderboard = await buildLeaderboard();
    return ok(leaderboard);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar la tabla", 500);
  }
}
