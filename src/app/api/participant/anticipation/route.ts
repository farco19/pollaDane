import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { getFirstMatchDate } from "@/lib/server/tournament";
import { requireSessionUser } from "@/lib/server/session";
import { anticipationPredictionSchema } from "@/lib/validators/anticipation";
import { TournamentSettings } from "@/models/TournamentSettings";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { AnticipationPrediction } from "@/models/AnticipationPrediction";

interface LeanPrediction {
  groupRankings?: Array<{
    group: string;
    firstTeamId?: string | { toString(): string } | null;
    secondTeamId?: string | { toString(): string } | null;
  }>;
  stageSelections?: {
    roundOf16TeamIds?: Array<string | { toString(): string }>;
    quarterFinalTeamIds?: Array<string | { toString(): string }>;
    semiFinalTeamIds?: Array<string | { toString(): string }>;
    finalTeamIds?: Array<string | { toString(): string }>;
    championTeamId?: string | { toString(): string } | null;
  };
  lockedAt?: Date | null;
}

function normalizeId(value: string | { toString(): string } | null | undefined) {
  return value ? value.toString() : null;
}

function normalizePrediction(prediction: LeanPrediction | null) {
  if (!prediction) {
    return null;
  }

  return {
    groupRankings: (prediction.groupRankings ?? []).map((item) => ({
      group: item.group,
      firstTeamId: normalizeId(item.firstTeamId),
      secondTeamId: normalizeId(item.secondTeamId),
    })),
    stageSelections: {
      roundOf16TeamIds: (prediction.stageSelections?.roundOf16TeamIds ?? []).map((item) => item.toString()),
      quarterFinalTeamIds: (prediction.stageSelections?.quarterFinalTeamIds ?? []).map((item) => item.toString()),
      semiFinalTeamIds: (prediction.stageSelections?.semiFinalTeamIds ?? []).map((item) => item.toString()),
      finalTeamIds: (prediction.stageSelections?.finalTeamIds ?? []).map((item) => item.toString()),
      championTeamId: normalizeId(prediction.stageSelections?.championTeamId),
    },
    lockedAt: prediction.lockedAt ?? null,
  };
}

export async function GET() {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();

    const [teams, matches, prediction, settings] = await Promise.all([
      Team.find({}).sort({ group: 1, name: 1 }).lean(),
      Match.find({}).sort({ matchDate: 1 }).select({ matchDate: 1 }).lean(),
      AnticipationPrediction.findOne({ userId: user.id }).lean(),
      TournamentSettings.findOne().lean(),
    ]);

    const firstMatchDate = getFirstMatchDate(matches);
    const locked = firstMatchDate ? firstMatchDate.getTime() <= Date.now() : false;
    const allTeams = teams.map((team) => ({
      _id: String(team._id),
      name: team.name,
      shortName: team.shortName,
      group: team.group ?? null,
      countryCode: team.code.toLowerCase(),
      flagUrl: team.flagUrl ?? null,
    }));
    const groups = Array.from(
      allTeams.reduce((map, team) => {
        if (!team.group) {
          return map;
        }

        map.set(team.group, [...(map.get(team.group) ?? []), team]);
        return map;
      }, new Map<string, typeof allTeams>()),
    )
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([group, groupTeams]) => ({ group, teams: groupTeams }));

    return ok({
      firstMatchDate,
      locked,
      settings: {
        anticipationScoring: settings?.anticipationScoring ?? null,
      },
      groups,
      teams: allTeams,
      prediction: normalizePrediction(prediction),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar los pronosticos anticipados", 401);
  }
}

export async function POST(request: Request) {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();
    const json = await request.json();
    const parsed = anticipationPredictionSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Pronostico anticipado invalido", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const [teams, matches] = await Promise.all([
      Team.find({}).lean(),
      Match.find({}).sort({ matchDate: 1 }).select({ matchDate: 1 }).lean(),
    ]);
    const firstMatchDate = getFirstMatchDate(matches);

    if (firstMatchDate && firstMatchDate.getTime() <= Date.now()) {
      return fail("Los pronosticos anticipados se cerraron al iniciar el primer partido", 400, "ANTICIPATION_CLOSED");
    }

    const teamMap = new Map(teams.map((team) => [String(team._id), team]));
    const validTeamIds = new Set(teamMap.keys());

    for (const ranking of parsed.data.groupRankings) {
      const groupTeams = teams.filter((team) => (team.group ?? "") === ranking.group).map((team) => String(team._id));
      if (ranking.firstTeamId && !groupTeams.includes(ranking.firstTeamId)) {
        return fail(`El equipo seleccionado para el grupo ${ranking.group} no pertenece a ese grupo`, 400);
      }
      if (ranking.secondTeamId && !groupTeams.includes(ranking.secondTeamId)) {
        return fail(`El equipo seleccionado para el grupo ${ranking.group} no pertenece a ese grupo`, 400);
      }
    }

    const arraysToValidate = [
      ...parsed.data.stageSelections.roundOf16TeamIds,
      ...parsed.data.stageSelections.quarterFinalTeamIds,
      ...parsed.data.stageSelections.semiFinalTeamIds,
      ...parsed.data.stageSelections.finalTeamIds,
    ];

    for (const teamId of arraysToValidate) {
      if (!validTeamIds.has(teamId)) {
        return fail("Hay equipos seleccionados que ya no existen", 400);
      }
    }

    if (parsed.data.stageSelections.championTeamId && !validTeamIds.has(parsed.data.stageSelections.championTeamId)) {
      return fail("El campeon seleccionado ya no existe", 400);
    }

    const prediction = await AnticipationPrediction.findOneAndUpdate(
      { userId: user.id },
      {
        ...parsed.data,
        userId: user.id,
        lockedAt: new Date(),
      },
      { new: true, upsert: true },
    );

    return ok({ prediction: normalizePrediction(prediction) }, "Pronosticos anticipados guardados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible guardar los pronosticos anticipados", 500);
  }
}
