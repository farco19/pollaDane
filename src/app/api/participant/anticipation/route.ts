/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAnticipationCandidatePools, sanitizeAnticipationForm, type AnticipationFormShape } from "@/lib/anticipation";
import { buildAnticipationActuals } from "@/lib/server/scoring/anticipation";
import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { defaultAnticipationScoring } from "@/lib/server/scoring/rules";
import { getCurrentGroupStandings, getFirstMatchDate, getGroupTopTwo, getOfficialBestThirdTeamIds, getQualifiedTeamIdsByStage } from "@/lib/server/tournament";
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
    bestThirdTeamIds?: Array<string | { toString(): string }>;
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

function normalizePrediction(
  prediction: LeanPrediction | null,
  teamGroupLookup?: Map<string, string | null | undefined>,
) {
  if (!prediction) {
    return null;
  }

  const normalized = sanitizeAnticipationForm({
    groupRankings: (prediction.groupRankings ?? []).map((item) => ({
      group: item.group,
      firstTeamId: normalizeId(item.firstTeamId),
      secondTeamId: normalizeId(item.secondTeamId),
    })),
    stageSelections: {
      bestThirdTeamIds: (prediction.stageSelections?.bestThirdTeamIds ?? []).map((item) => item.toString()),
      roundOf16TeamIds: (prediction.stageSelections?.roundOf16TeamIds ?? []).map((item) => item.toString()),
      quarterFinalTeamIds: (prediction.stageSelections?.quarterFinalTeamIds ?? []).map((item) => item.toString()),
      semiFinalTeamIds: (prediction.stageSelections?.semiFinalTeamIds ?? []).map((item) => item.toString()),
      finalTeamIds: (prediction.stageSelections?.finalTeamIds ?? []).map((item) => item.toString()),
      championTeamId: normalizeId(prediction.stageSelections?.championTeamId),
    },
  }, { teamGroupLookup });

  return {
    ...normalized,
    lockedAt: prediction.lockedAt ?? null,
  };
}

function teamSummary(team: any) {
  if (!team) {
    return null;
  }

  return {
    _id: String(team._id),
    name: team.name,
    shortName: team.shortName,
    group: team.group ?? null,
    countryCode: team.code.toLowerCase(),
    flagUrl: team.flagUrl ?? null,
  };
}

function buildStandingsOverview(
  teams: any[],
  matches: any[],
  settings?: { officialBestThirdTeamIds?: Array<string | { toString(): string } | null | undefined> | null } | null,
) {
  const teamMap = new Map(teams.map((team) => [String(team._id), team]));
  const currentStandings = getCurrentGroupStandings(matches);
  const officialTopTwo = getGroupTopTwo(matches);
  const officialBestThirdIds = new Set(getOfficialBestThirdTeamIds(settings));
  const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
  const groupMatchMap = groupMatches.reduce((map: Map<string, any[]>, match: any) => {
    const group = String(match.group);
    map.set(group, [...(map.get(group) ?? []), match]);
    return map;
  }, new Map<string, any[]>());
  const groupedTeams = teams.reduce((map: Map<string, any[]>, team: any) => {
    const group = team.group ?? "";
    if (!group) {
      return map;
    }

    map.set(group, [...(map.get(group) ?? []), team]);
    return map;
  }, new Map<string, any[]>());

  const groupEntries = Array.from(groupedTeams.entries()) as Array<[string, any[]]>;

  const groups = groupEntries
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([group, groupTeams]) => {
      const standings = currentStandings.get(group) ?? [];
      const standingMap = new Map(standings.map((entry) => [entry.teamId, entry]));
      const officialQualified = new Set(officialTopTwo.get(group) ?? []);
      const matchesForGroup = groupMatchMap.get(group) ?? [];
      const completed = matchesForGroup.length > 0 && matchesForGroup.every((match: any) => match.status === "finished");

      return {
        group,
        completed,
        officialQualifiedTeamIds: Array.from(officialQualified),
        rows: groupTeams
          .map((team) => {
            const standing = standingMap.get(String(team._id));
            return {
              ...teamSummary(team),
              played: standing?.played ?? 0,
              points: standing?.points ?? 0,
              goalDifference: standing?.goalDifference ?? 0,
              goalsFor: standing?.goalsFor ?? 0,
              goalsAgainst: standing?.goalsAgainst ?? 0,
              isOfficialTopTwo: officialQualified.has(String(team._id)),
              isOfficialBestThird: officialBestThirdIds.has(String(team._id)),
            };
          })
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.name.localeCompare(b.name, "es");
          }),
      };
    });

  return {
    groups,
    official: {
      bestThirdTeams: Array.from(officialBestThirdIds).map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      roundOf32Teams: getQualifiedTeamIdsByStage(matches, "round_of_32").map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      roundOf16Teams: getQualifiedTeamIdsByStage(matches, "round_of_16").map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      quarterFinalTeams: getQualifiedTeamIdsByStage(matches, "quarter_final").map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      semiFinalTeams: getQualifiedTeamIdsByStage(matches, "semi_final").map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      finalTeams: getQualifiedTeamIdsByStage(matches, "final").map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      championTeam: (() => {
        const championMatch = matches.find((match) => match.stage === "final" && match.status === "finished");
        if (!championMatch || championMatch.homeScore == null || championMatch.awayScore == null || championMatch.homeScore === championMatch.awayScore) {
          return null;
        }
        const championId = championMatch.homeScore > championMatch.awayScore
          ? String(championMatch.homeTeamId?._id ?? championMatch.homeTeamId)
          : String(championMatch.awayTeamId?._id ?? championMatch.awayTeamId);
        const team = teamMap.get(championId);
        return team ? teamSummary(team) : null;
      })(),
    },
  };
}

function buildAnticipationBreakdown(
  prediction: ReturnType<typeof normalizePrediction>,
  teams: any[],
  matches: any[],
  scoring: any,
  settings?: { officialBestThirdTeamIds?: Array<string | { toString(): string } | null | undefined> | null } | null,
) {
  if (!prediction) {
    return null;
  }

  const actuals = buildAnticipationActuals(matches, settings);
  const teamMap = new Map(teams.map((team) => [String(team._id), team]));
  const officialTopTwo = actuals.groupTopTwo;
  const currentStandings = getCurrentGroupStandings(matches);
  const byGroup = matches
    .filter((match) => match.stage === "group" && match.group)
    .reduce((map: Map<string, any[]>, match: any) => {
      const group = String(match.group);
      map.set(group, [...(map.get(group) ?? []), match]);
      return map;
    }, new Map<string, any[]>());

  const groupDetails = prediction.groupRankings.map((groupPrediction) => {
    const official = officialTopTwo.get(groupPrediction.group) ?? [];
    const resolved = (byGroup.get(groupPrediction.group) ?? []).length > 0 && (byGroup.get(groupPrediction.group) ?? []).every((match) => match.status === "finished");
    const selectedIds = [groupPrediction.firstTeamId, groupPrediction.secondTeamId].filter((item): item is string => Boolean(item));
    const hits = selectedIds.filter((teamId) => official.includes(teamId));

    return {
      group: groupPrediction.group,
      resolved,
      pointsAwarded: hits.length * scoring.groupQualifiedPoints,
      officialTopTwo: official.map((teamId) => teamSummary(teamMap.get(teamId))).filter(Boolean),
      currentTable: (currentStandings.get(groupPrediction.group) ?? []).map((entry) => ({
        ...teamSummary(teamMap.get(entry.teamId)),
        points: entry.points,
        played: entry.played,
        goalDifference: entry.goalDifference,
      })).filter((team) => team._id),
      selections: [
        {
          slot: "Primer clasificado",
          team: groupPrediction.firstTeamId ? teamSummary(teamMap.get(groupPrediction.firstTeamId)) : null,
          hit: groupPrediction.firstTeamId ? official.includes(groupPrediction.firstTeamId) : false,
        },
        {
          slot: "Segundo clasificado",
          team: groupPrediction.secondTeamId ? teamSummary(teamMap.get(groupPrediction.secondTeamId)) : null,
          hit: groupPrediction.secondTeamId ? official.includes(groupPrediction.secondTeamId) : false,
        },
      ],
    };
  });

  const buildStageSection = (selectedIds: string[], actualIds: Set<string>, points: number, label: string) => ({
    label,
    pointsPerHit: points,
    pointsAwarded: selectedIds.filter((teamId) => actualIds.has(teamId)).length * points,
    selections: selectedIds.map((teamId) => ({
      team: teamSummary(teamMap.get(teamId)),
      hit: actualIds.has(teamId),
    })).filter((item) => item.team),
  });

  const championId = prediction.stageSelections.championTeamId;
  const championHit = Boolean(championId && actuals.championTeamId === championId);

  return {
    totalPoints:
      groupDetails.reduce((sum, group) => sum + group.pointsAwarded, 0) +
      prediction.stageSelections.bestThirdTeamIds.filter((teamId) => actuals.bestThirdTeamIds.has(teamId)).length * scoring.bestThirdPoints +
      prediction.stageSelections.roundOf16TeamIds.filter((teamId) => actuals.roundOf16TeamIds.has(teamId)).length * scoring.roundOf16Points +
      prediction.stageSelections.quarterFinalTeamIds.filter((teamId) => actuals.quarterFinalTeamIds.has(teamId)).length * scoring.quarterFinalPoints +
      prediction.stageSelections.semiFinalTeamIds.filter((teamId) => actuals.semiFinalTeamIds.has(teamId)).length * scoring.semiFinalPoints +
      prediction.stageSelections.finalTeamIds.filter((teamId) => actuals.finalTeamIds.has(teamId)).length * scoring.finalPoints +
      (championHit ? scoring.championPoints : 0),
    groupDetails,
    bestThird: buildStageSection(prediction.stageSelections.bestThirdTeamIds, actuals.bestThirdTeamIds, scoring.bestThirdPoints, "Mejores terceros"),
    roundOf16: buildStageSection(prediction.stageSelections.roundOf16TeamIds, actuals.roundOf16TeamIds, scoring.roundOf16Points, "Octavos"),
    quarterFinal: buildStageSection(prediction.stageSelections.quarterFinalTeamIds, actuals.quarterFinalTeamIds, scoring.quarterFinalPoints, "Cuartos"),
    semiFinal: buildStageSection(prediction.stageSelections.semiFinalTeamIds, actuals.semiFinalTeamIds, scoring.semiFinalPoints, "Semifinal"),
    final: buildStageSection(prediction.stageSelections.finalTeamIds, actuals.finalTeamIds, scoring.finalPoints, "Final"),
    champion: {
      pointsPerHit: scoring.championPoints,
      pointsAwarded: championHit ? scoring.championPoints : 0,
      selection: championId ? teamSummary(teamMap.get(championId)) : null,
      official: actuals.championTeamId ? teamSummary(teamMap.get(actuals.championTeamId)) : null,
      hit: championHit,
    },
  };
}

export async function GET() {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();

    const [teams, matches, prediction, settings] = await Promise.all([
      Team.find({}).sort({ group: 1, name: 1 }).lean(),
      Match.find({}).sort({ matchDate: 1 }).lean(),
      AnticipationPrediction.findOne({ userId: user.id }).lean(),
      TournamentSettings.findOne().lean(),
    ]);

    const firstMatchDate = getFirstMatchDate(matches);
    const predictionLocked = Boolean(prediction?.lockedAt);
    const closedBySchedule = firstMatchDate ? firstMatchDate.getTime() <= Date.now() : false;
    const locked = predictionLocked || closedBySchedule;
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
    const teamGroupLookup = new Map<string, string | null>(teams.map((team) => [String(team._id), team.group ?? null]));
    const standingsOverview = buildStandingsOverview(teams, matches, settings);
    const scoring = {
      ...defaultAnticipationScoring,
      ...(settings?.anticipationScoring ?? {}),
    };
    const normalizedPrediction = normalizePrediction(prediction, teamGroupLookup);

    return ok({
      firstMatchDate,
      locked,
      settings: {
        anticipationScoring: scoring,
        officialBestThirdTeamIds: getOfficialBestThirdTeamIds(settings),
      },
      groups,
      teams: allTeams,
      standingsOverview,
      breakdown: buildAnticipationBreakdown(normalizedPrediction, teams, matches, scoring, settings),
      prediction: normalizedPrediction,
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

    const [teams, matches, existingPrediction] = await Promise.all([
      Team.find({}).lean(),
      Match.find({}).sort({ matchDate: 1 }).select({ matchDate: 1 }).lean(),
      AnticipationPrediction.findOne({ userId: user.id }).select({ lockedAt: 1 }).lean(),
    ]);
    const firstMatchDate = getFirstMatchDate(matches);

    if (existingPrediction?.lockedAt) {
      return fail("Tus pronosticos anticipados ya fueron guardados y no se pueden modificar", 400, "ANTICIPATION_LOCKED");
    }

    if (firstMatchDate && firstMatchDate.getTime() <= Date.now()) {
      return fail("Los pronosticos anticipados se cerraron al iniciar el primer partido", 400, "ANTICIPATION_CLOSED");
    }

    const teamMap = new Map(teams.map((team) => [String(team._id), team]));
    const validTeamIds = new Set(teamMap.keys());
    const teamsWithGroup = new Set(teams.filter((team) => team.group).map((team) => String(team._id)));

    for (const ranking of parsed.data.groupRankings) {
      const groupTeams = teams.filter((team) => (team.group ?? "") === ranking.group).map((team) => String(team._id));
      if (ranking.firstTeamId && !groupTeams.includes(ranking.firstTeamId)) {
        return fail(`El equipo seleccionado para el grupo ${ranking.group} no pertenece a ese grupo`, 400);
      }
      if (ranking.secondTeamId && !groupTeams.includes(ranking.secondTeamId)) {
        return fail(`El equipo seleccionado para el grupo ${ranking.group} no pertenece a ese grupo`, 400);
      }
    }

    for (const teamId of parsed.data.stageSelections.bestThirdTeamIds) {
      if (!validTeamIds.has(teamId) || !teamsWithGroup.has(teamId)) {
        return fail("Hay terceros seleccionados que ya no existen o no pertenecen a grupos", 400);
      }
    }

    const qualifiedFromGroups = new Set(
      parsed.data.groupRankings.flatMap((ranking) => [ranking.firstTeamId, ranking.secondTeamId].filter((teamId): teamId is string => Boolean(teamId))),
    );

    for (const teamId of parsed.data.stageSelections.bestThirdTeamIds) {
      if (qualifiedFromGroups.has(teamId)) {
        return fail("Un mejor tercero no puede repetirse entre los clasificados directos por grupo", 400);
      }
    }

    const selectedBestThirdGroups = new Set<string>();

    for (const teamId of parsed.data.stageSelections.bestThirdTeamIds) {
      const group = teamMap.get(teamId)?.group ?? null;

      if (!group) {
        return fail("Cada mejor tercero debe pertenecer a un grupo valido", 400);
      }

      if (selectedBestThirdGroups.has(group)) {
        return fail(`Solo puedes elegir un mejor tercero por grupo. Revisa el grupo ${group}`, 400);
      }

      selectedBestThirdGroups.add(group);
    }

    const sanitizedPrediction: AnticipationFormShape = sanitizeAnticipationForm(parsed.data, {
      teamGroupLookup: new Map<string, string | null>(teams.map((team) => [String(team._id), team.group ?? null])),
    });
    const candidatePools = getAnticipationCandidatePools(sanitizedPrediction);

    for (const teamId of candidatePools.roundOf16CandidateIds) {
      if (!validTeamIds.has(teamId)) {
        return fail("Hay equipos seleccionados que ya no existen", 400);
      }
    }

    for (const teamId of sanitizedPrediction.stageSelections.roundOf16TeamIds) {
      if (!candidatePools.roundOf16CandidateIds.includes(teamId)) {
        return fail("En octavos solo puedes elegir equipos clasificados desde grupos y mejores terceros", 400);
      }
    }

    for (const teamId of sanitizedPrediction.stageSelections.quarterFinalTeamIds) {
      if (!candidatePools.quarterFinalCandidateIds.includes(teamId)) {
        return fail("En cuartos solo puedes elegir equipos que seleccionaste para octavos", 400);
      }
    }

    for (const teamId of sanitizedPrediction.stageSelections.semiFinalTeamIds) {
      if (!candidatePools.semiFinalCandidateIds.includes(teamId)) {
        return fail("En semifinal solo puedes elegir equipos que seleccionaste para cuartos", 400);
      }
    }

    for (const teamId of sanitizedPrediction.stageSelections.finalTeamIds) {
      if (!candidatePools.finalCandidateIds.includes(teamId)) {
        return fail("En la final solo puedes elegir equipos que seleccionaste para semifinal", 400);
      }
    }

    if (sanitizedPrediction.stageSelections.championTeamId && !validTeamIds.has(sanitizedPrediction.stageSelections.championTeamId)) {
      return fail("El campeon seleccionado ya no existe", 400);
    }

    if (sanitizedPrediction.stageSelections.championTeamId && !candidatePools.finalCandidateIds.includes(sanitizedPrediction.stageSelections.championTeamId)) {
      return fail("El campeon debe salir de los equipos que seleccionaste para la final", 400);
    }

    const prediction = await AnticipationPrediction.findOneAndUpdate(
      { userId: user.id },
      {
        ...sanitizedPrediction,
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
