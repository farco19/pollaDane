import { bootstrapDataLayer, getMatchesForUser } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { buildFlagUrl } from "@/lib/flagcdn";
import { requireAdminUser } from "@/lib/server/session";
import { matchCreateSchema } from "@/lib/validators/match";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { Team } from "@/models/Team";

export async function GET() {
  try {
    await requireAdminUser();
    const [matches, teams] = await Promise.all([getMatchesForUser(), Team.find({}).sort({ name: 1 }).lean()]);
    return ok({
      matches,
      teams: teams.map((team) => ({
        _id: String(team._id),
        name: team.name,
        shortName: team.shortName,
        countryCode: team.code.toLowerCase(),
        flagUrl: team.flagUrl ?? buildFlagUrl(team.code),
      })),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar partidos", 403);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();

    const json = await request.json().catch(() => ({}));
    const matchId = typeof json.id === "string" ? json.id : "";

    if (!matchId) {
      return fail("Debes indicar el partido a eliminar", 400);
    }

    const match = await Match.findById(matchId).lean();

    if (!match) {
      return fail("Partido no encontrado", 404);
    }

    const hasStarted = new Date(match.matchDate).getTime() <= Date.now();

    if (match.status !== "scheduled" || hasStarted) {
      return fail("Solo se pueden eliminar partidos programados que aun no hayan comenzado", 409);
    }

    await Promise.all([Prediction.deleteMany({ matchId: match._id }), Match.deleteOne({ _id: match._id })]);

    return ok({ _id: String(match._id) }, "Partido eliminado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible eliminar el partido", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = matchCreateSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Partido invalido", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const match = await Match.create(parsed.data);
    return ok({ _id: String(match._id) }, "Partido creado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible crear el partido", 500);
  }
}
