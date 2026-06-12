import { getPredictionsForUser, bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { getFirstMatchDate, isMatchPredictionClosed } from "@/lib/server/tournament";
import { requireSessionUser } from "@/lib/server/session";
import { predictionCreateSchema } from "@/lib/validators/prediction";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { TournamentSettings } from "@/models/TournamentSettings";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const predictions = await getPredictionsForUser(user.id);
    return ok(predictions);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar pronosticos", 401);
  }
}

export async function POST(request: Request) {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();
    const json = await request.json();
    const parsed = predictionCreateSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Pronostico invalido", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const { matchId, predictedHomeScore, predictedAwayScore } = parsed.data;
    const [match, settings, allMatches] = await Promise.all([
      Match.findById(matchId).lean(),
      TournamentSettings.findOne().lean(),
      Match.find({}).sort({ matchDate: 1 }).select({ matchDate: 1 }).lean(),
    ]);

    if (!match) {
      return fail("Partido no encontrado", 404, "MATCH_NOT_FOUND");
    }

    const firstMatchDate = getFirstMatchDate(allMatches);
    const predictionCutoffMode = settings?.predictionCutoffMode ?? "match_start";

    if (
      isMatchPredictionClosed({
        matchStatus: match.status,
        predictionAccessMode: match.predictionAccessMode ?? "scheduled",
        mode: predictionCutoffMode,
        matchDate: match.matchDate,
        firstMatchDate,
      })
    ) {
      const message =
        match.status === "finished"
          ? "Este partido ya finalizo y no admite cambios"
          : match.predictionAccessMode === "manual_locked"
            ? "La edicion de pronosticos para este partido fue bloqueada manualmente por el administrador"
            : "Este partido se cierra 15 minutos antes de iniciar y ya no admite pronosticos";
      return fail(message, 400, "MATCH_CLOSED");
    }

    const prediction = await Prediction.findOneAndUpdate(
      { userId: user.id, matchId },
      {
        userId: user.id,
        matchId,
        predictedHomeScore,
        predictedAwayScore,
        lockedAt: new Date(),
        pointsAwarded: null,
        scoredAt: null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return ok({ predictionId: String(prediction._id) }, "Pronostico guardado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible guardar el pronostico", 500);
  }
}
