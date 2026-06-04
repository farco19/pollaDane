/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { getCurrentGroupStandings, getGroupTopTwo, getOfficialBestThirdTeamIds, getThirdPlaceStandings } from "@/lib/server/tournament";
import { Match } from "@/models/Match";
import { Team } from "@/models/Team";
import { TournamentSettings } from "@/models/TournamentSettings";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id invalido");

const officialBestThirdSchema = z.object({
  officialBestThirdTeamIds: z.array(objectIdSchema).max(8).refine((items) => new Set(items).size === items.length, {
    message: "No se permiten equipos repetidos",
  }),
});

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

export async function GET() {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();

    const [teams, matches, settings] = await Promise.all([
      Team.find({}).sort({ group: 1, name: 1 }).lean(),
      Match.find({}).sort({ matchDate: 1 }).lean(),
      TournamentSettings.findOne().lean(),
    ]);

    const teamMap = new Map(teams.map((team) => [String(team._id), team]));
    const currentStandings = getCurrentGroupStandings(matches);
    const officialTopTwo = getGroupTopTwo(matches);
    const officialBestThirdTeamIds = getOfficialBestThirdTeamIds(settings);
    const officialBestThirdSet = new Set(officialBestThirdTeamIds);
    const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
    const thirdPlaceRanking = getThirdPlaceStandings(matches, { requireCompleted: true });
    const recommendedBestThirdTeamIds = thirdPlaceRanking.slice(0, 8).map((entry) => entry.teamId);
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

    const groups = Array.from(groupedTeams.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([group, groupTeams]) => {
        const standings = currentStandings.get(group) ?? [];
        const standingMap = new Map(standings.map((entry) => [entry.teamId, entry]));
        const matchesForGroup = groupMatchMap.get(group) ?? [];
        const completed = matchesForGroup.length > 0 && matchesForGroup.every((match: any) => match.status === "finished");
        const thirdPlaceTeamId = standings[2]?.teamId ?? null;

        return {
          group,
          completed,
          thirdPlaceTeamId,
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
                isOfficialTopTwo: (officialTopTwo.get(group) ?? []).includes(String(team._id)),
                isCurrentThird: thirdPlaceTeamId === String(team._id),
                isOfficialBestThird: officialBestThirdSet.has(String(team._id)),
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

    return ok({
      officialBestThirdTeamIds,
      recommendedBestThirdTeamIds,
      canOfficialize: recommendedBestThirdTeamIds.length === 8,
      groups,
      thirdPlaceRanking: thirdPlaceRanking
        .map((entry) => ({
          group: entry.group,
          points: entry.points,
          goalDifference: entry.goalDifference,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          team: teamSummary(teamMap.get(entry.teamId)),
        }))
        .filter((entry) => entry.team),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar la clasificacion oficial", 403);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdminUser();
    await bootstrapDataLayer();
    const json = await request.json();
    const parsed = officialBestThirdSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Seleccion invalida", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    const { officialBestThirdTeamIds } = parsed.data;

    if (officialBestThirdTeamIds.length !== 0 && officialBestThirdTeamIds.length !== 8) {
      return fail("Debes guardar exactamente 8 mejores terceros oficiales o limpiar la seleccion completa", 400);
    }

    const teams = await Team.find({ _id: { $in: officialBestThirdTeamIds } }).select({ _id: 1, group: 1 }).lean();

    if (teams.length !== officialBestThirdTeamIds.length) {
      return fail("Hay equipos oficiales que ya no existen", 400);
    }

    const teamIds = new Set(teams.filter((team) => team.group).map((team) => String(team._id)));

    if (teamIds.size !== officialBestThirdTeamIds.length) {
      return fail("Todos los mejores terceros oficiales deben pertenecer a un grupo", 400);
    }

    await TournamentSettings.findOneAndUpdate(
      {},
      {
        officialBestThirdTeamIds,
        updatedBy: user.id,
      },
      { new: true, upsert: true },
    );

    return ok({ officialBestThirdTeamIds }, officialBestThirdTeamIds.length ? "Mejores terceros oficiales guardados" : "Mejores terceros oficiales limpiados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible guardar la clasificacion oficial", 500);
  }
}
