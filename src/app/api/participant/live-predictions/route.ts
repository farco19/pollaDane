import { fail, ok } from "@/lib/server/api";
import { bootstrapDataLayer } from "@/lib/server/data";
import { syncExternalLiveMatchesIfNeeded } from "@/lib/server/live-sync";
import { requireSessionUser } from "@/lib/server/session";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { TournamentSettings } from "@/models/TournamentSettings";
import { User } from "@/models/User";

type PopulatedTeamRef = {
  _id?: unknown;
  name?: string;
  shortName?: string;
  flagUrl?: string | null;
} | null | undefined;

type LiveMatch = {
  _id: string;
  stage: string;
  group: string | null;
  stadium: string;
  matchDate: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    _id: string;
    name: string;
    shortName: string;
    flagUrl: string | null;
  };
  awayTeam: {
    _id: string;
    name: string;
    shortName: string;
    flagUrl: string | null;
  };
};

function serializeTeam(team: PopulatedTeamRef, fallbackName: string, fallbackShortName: string) {
  return {
    _id: String(team?._id ?? ""),
    name: team?.name ?? fallbackName,
    shortName: team?.shortName ?? fallbackShortName,
    flagUrl: team?.flagUrl ?? null,
  };
}

export async function GET() {
  try {
    await requireSessionUser();
    await bootstrapDataLayer();

    const matches = await Match.find({ status: "live" }).sort({ matchDate: 1 }).populate("homeTeamId awayTeamId").lean();
    const matchIds = matches.map((match) => match._id);
    const [predictions, users] = await Promise.all([
      matchIds.length ? Prediction.find({ matchId: { $in: matchIds } }).lean() : Promise.resolve([]),
      User.find({ role: "participant", isActive: true }).select({ _id: 1, name: 1 }).lean(),
    ]);

    const predictionMap = new Map(predictions.map((prediction) => [`${String(prediction.matchId)}:${String(prediction.userId)}`, prediction]));

    const liveMatches = matches.map((match) => {
      const rows = users
        .map((user) => {
          const key = `${String(match._id)}:${String(user._id)}`;
          const prediction = predictionMap.get(key);

          return {
            userId: String(user._id),
            name: user.name,
            predictedHomeScore: prediction?.predictedHomeScore ?? null,
            predictedAwayScore: prediction?.predictedAwayScore ?? null,
            hasPrediction: Boolean(prediction),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      const serializedMatch: LiveMatch = {
        _id: String(match._id),
        stage: match.stage,
        group: match.group ?? null,
        stadium: match.stadium,
        matchDate: match.matchDate,
        status: match.status,
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
        homeTeam: serializeTeam(match.homeTeamId as PopulatedTeamRef, "Equipo local", "LOC"),
        awayTeam: serializeTeam(match.awayTeamId as PopulatedTeamRef, "Equipo visitante", "VIS"),
      };

      return {
        ...serializedMatch,
        rows,
      };
    });

    return ok({
      matches: liveMatches,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar los partidos en vivo", 401);
  }
}
