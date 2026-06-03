import { applyMatchResult } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { sendMatchResultNotifications } from "@/lib/server/push";
import { requireAdminUser } from "@/lib/server/session";
import { resultLoadSchema } from "@/lib/validators/result";

export async function POST(request: Request, context: RouteContext<"/api/admin/results/[matchId]">) {
  try {
    await requireAdminUser();
    const params = await context.params;
    const json = await request.json();
    const parsed = resultLoadSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Resultado invalido", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const leaderboardBefore = await buildLeaderboard();
    const match = await applyMatchResult(params.matchId, parsed.data.homeScore, parsed.data.awayScore);
    const leaderboardAfter = await buildLeaderboard();
    await sendMatchResultNotifications({
      matchId: String(match._id),
      leaderboardBefore,
      leaderboardAfter,
    });
    return ok({ matchId: String(match._id) }, "Resultado cargado y tabla recalculada");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar el resultado", 500);
  }
}
