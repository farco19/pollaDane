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
        group: team.group ?? null,
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

    const teams = await Team.find({ _id: { $in: [parsed.data.homeTeamId, parsed.data.awayTeamId] } })
      .select({ _id: 1, group: 1 })
      .lean();

    if (teams.length !== 2) {
      return fail("Debes seleccionar equipos validos", 400);
    }

    const homeTeam = teams.find((team) => String(team._id) === parsed.data.homeTeamId);
    const awayTeam = teams.find((team) => String(team._id) === parsed.data.awayTeamId);

    if (!homeTeam || !awayTeam) {
      return fail("Debes seleccionar equipos validos", 400);
    }

    let group: string | null = null;

    if (parsed.data.stage === "group") {
      const homeGroup = homeTeam.group?.trim() ?? "";
      const awayGroup = awayTeam.group?.trim() ?? "";

      if (!homeGroup || !awayGroup) {
        return fail("Los equipos de fase de grupos deben tener un grupo asignado", 400);
      }

      if (homeGroup !== awayGroup) {
        return fail("En fase de grupos solo puedes enfrentar equipos del mismo grupo", 400);
      }

      group = homeGroup;
    }

    const match = await Match.create({
      ...parsed.data,
      group,
    });
    return ok({ _id: String(match._id) }, "Partido creado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible crear el partido", 500);
  }
}
