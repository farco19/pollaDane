import { getMatchesForUser } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { syncExternalLiveMatchesIfNeeded } from "@/lib/server/live-sync";

export async function GET() {
  try {
    await syncExternalLiveMatchesIfNeeded();
    const matches = await getMatchesForUser();
    const finished = matches.filter((match) => match.homeScore != null && match.awayScore != null);
    return ok(finished);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar resultados", 500);
  }
}
