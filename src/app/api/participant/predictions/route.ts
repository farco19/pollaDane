import { getPredictionsForUser, bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { getFirstMatchDate, isPredictionClosed } from "@/lib/server/tournament";
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
    const [existing, match, settings, allMatches] = await Promise.all([
      Prediction.findOne({ userId: user.id, matchId }).lean(),
      Match.findById(matchId).lean(),
      TournamentSettings.findOne().lean(),
      Match.find({}).sort({ matchDate: 1 }).select({ matchDate: 1 }).lean(),
    ]);

    if (existing) {
      return fail("Este partido ya fue pronosticado y no puede modificarse", 409, "ALREADY_PREDICTED");
    }

    if (!match) {
      return fail("Partido no encontrado", 404, "MATCH_NOT_FOUND");
    }

    const firstMatchDate = getFirstMatchDate(allMatches);
    const predictionCutoffMode = settings?.predictionCutoffMode ?? "first_match_start";

    if (
      isPredictionClosed({
        mode: predictionCutoffMode,
        matchDate: match.matchDate,
        firstMatchDate,
      })
    ) {
      return fail("El partido ya inicio y esta cerrado para pronosticos", 400, "MATCH_CLOSED");
    }

    const prediction = await Prediction.create({
      userId: user.id,
      matchId,
      predictedHomeScore,
      predictedAwayScore,
      lockedAt: new Date(),
    });

    return ok({ predictionId: String(prediction._id) }, "Pronostico guardado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible guardar el pronostico", 500);
  }
}
