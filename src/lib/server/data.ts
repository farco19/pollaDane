/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/db";
import { ensureSeedData } from "@/lib/seed";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { calculatePredictionPoints } from "@/lib/server/scoring/calculatePredictionPoints";
import { defaultAnticipationScoring, defaultMatchScoring } from "@/lib/server/scoring/rules";
import { getFirstMatchDate, isPredictionClosed } from "@/lib/server/tournament";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { TournamentSettings } from "@/models/TournamentSettings";
import { User } from "@/models/User";

export async function bootstrapDataLayer() {
  await connectToDatabase();
  await ensureSeedData();
}

function getNormalizedSettings(settings: any) {
  return {
    entryFee: settings?.entryFee ?? 0,
    currency: settings?.currency ?? "COP",
    predictionCutoffMode: settings?.predictionCutoffMode ?? "first_match_start",
    matchScoring: {
      ...defaultMatchScoring,
      ...(settings?.matchScoring ?? {}),
    },
    anticipationScoring: {
      ...defaultAnticipationScoring,
      ...(settings?.anticipationScoring ?? {}),
    },
  };
}

function serializeMatch(match: any, settings: any, firstMatchDate: Date | null, prediction?: any) {
  return {
    _id: String(match._id),
    stage: match.stage,
    group: match.group ?? null,
    stadium: match.stadium,
    matchDate: match.matchDate,
    status: match.status,
    isClosed:
      match.status === "finished" ||
      isPredictionClosed({
        mode: settings.predictionCutoffMode,
        matchDate: match.matchDate,
        firstMatchDate,
      }),
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    homeTeam: {
      _id: String(match.homeTeamId?._id ?? match.homeTeamId),
      name: match.homeTeamId?.name ?? "Equipo local",
      shortName: match.homeTeamId?.shortName ?? "LOC",
      flagUrl: match.homeTeamId?.flagUrl ?? null,
    },
    awayTeam: {
      _id: String(match.awayTeamId?._id ?? match.awayTeamId),
      name: match.awayTeamId?.name ?? "Equipo visitante",
      shortName: match.awayTeamId?.shortName ?? "VIS",
      flagUrl: match.awayTeamId?.flagUrl ?? null,
    },
    prediction: prediction
      ? {
          _id: String(prediction._id),
          predictedHomeScore: prediction.predictedHomeScore,
          predictedAwayScore: prediction.predictedAwayScore,
          pointsAwarded: prediction.pointsAwarded ?? null,
          lockedAt: prediction.lockedAt,
        }
      : null,
  };
}

export async function getMatchesForUser(userId?: string) {
  await bootstrapDataLayer();

  const [matches, predictions, rawSettings] = await Promise.all([
    Match.find({}).sort({ matchDate: 1 }).populate("homeTeamId awayTeamId").lean(),
    userId ? Prediction.find({ userId }).lean() : Promise.resolve([]),
    TournamentSettings.findOne().lean(),
  ]);

  const settings = getNormalizedSettings(rawSettings);
  const firstMatchDate = getFirstMatchDate(matches);
  const predictionMap = new Map(predictions.map((item) => [String(item.matchId), item]));
  return matches.map((match) => serializeMatch(match, settings, firstMatchDate, predictionMap.get(String(match._id))));
}

export async function getPredictionsForUser(userId: string) {
  const matches = await getMatchesForUser(userId);
  return matches.filter((match) => match.prediction);
}

export async function getPublicSettings() {
  await bootstrapDataLayer();
  const [settings, leaderboard, matches] = await Promise.all([TournamentSettings.findOne().lean(), buildLeaderboard(), Match.find({}).sort({ matchDate: 1 }).lean()]);
  const normalizedSettings = getNormalizedSettings(settings);
  const firstMatchDate = getFirstMatchDate(matches);

  return {
    entryFee: normalizedSettings.entryFee,
    currency: normalizedSettings.currency,
    predictionCutoffMode: normalizedSettings.predictionCutoffMode,
    matchScoring: normalizedSettings.matchScoring,
    anticipationScoring: normalizedSettings.anticipationScoring,
    firstMatchDate,
    prizePool: leaderboard.prizePool,
    participants: leaderboard.participants,
  };
}

export async function getParticipantDashboard(userId: string) {
  const [leaderboardData, matches, settings] = await Promise.all([
    buildLeaderboard(),
    getMatchesForUser(userId),
    getPublicSettings(),
  ]);

  const mine = leaderboardData.leaderboard.find((entry) => entry.userId === userId);
  const upcomingMatches = matches.filter((match) => new Date(match.matchDate).getTime() > Date.now()).slice(0, 3);
  const recentPredictions = matches.filter((match) => match.prediction).slice(-5).reverse();

  return {
    summary: {
      totalPoints: mine?.totalPoints ?? 0,
      matchPoints: mine?.matchPoints ?? 0,
      anticipationPoints: mine?.anticipationPoints ?? 0,
      rank: mine?.rank ?? leaderboardData.participants,
      exactHits: mine?.exactHits ?? 0,
      predictionsScored: mine?.predictionsScored ?? 0,
      prizePool: settings.prizePool,
      entryFee: settings.entryFee,
      participants: settings.participants,
    },
    rules: {
      matchScoring: settings.matchScoring,
      anticipationScoring: settings.anticipationScoring,
    },
    upcomingMatches,
    recentPredictions,
    leaderboardPreview: leaderboardData.leaderboard.slice(0, 5),
  };
}

export async function applyMatchResult(matchId: string, homeScore: number, awayScore: number) {
  await bootstrapDataLayer();

  const [settings, match] = await Promise.all([
    TournamentSettings.findOne().lean(),
    Match.findByIdAndUpdate(
    matchId,
    {
      homeScore,
      awayScore,
      status: "finished",
      resultLoadedAt: new Date(),
    },
    { new: true },
    ),
  ]);

  if (!match) {
    throw new Error("Partido no encontrado");
  }

  const predictions = await Prediction.find({ matchId });
  const scoring = getNormalizedSettings(settings).matchScoring;

  await Promise.all(
    predictions.map((prediction) => {
      const points = calculatePredictionPoints(
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        homeScore,
        awayScore,
        scoring,
      );

      prediction.pointsAwarded = points;
      prediction.scoredAt = new Date();
      return prediction.save();
    }),
  );

  return match;
}

export async function recalculateScoredPredictions() {
  await bootstrapDataLayer();

  const [settings, finishedMatches, predictions] = await Promise.all([
    TournamentSettings.findOne().lean(),
    Match.find({ status: "finished" }).lean(),
    Prediction.find({}).lean(),
  ]);

  const scoring = getNormalizedSettings(settings).matchScoring;
  const matchMap = new Map(finishedMatches.map((match) => [String(match._id), match]));

  await Promise.all(
    predictions.map((prediction) => {
      const match = matchMap.get(String(prediction.matchId));
      if (!match || match.homeScore == null || match.awayScore == null) {
        return Promise.resolve();
      }

      const nextPoints = calculatePredictionPoints(
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        match.homeScore,
        match.awayScore,
        scoring,
      );

      return Prediction.updateOne(
        { _id: prediction._id },
        {
          $set: {
            pointsAwarded: nextPoints,
            scoredAt: prediction.scoredAt ?? new Date(),
          },
        },
      );
    }),
  );
}

export async function getAdminSummary() {
  await bootstrapDataLayer();

  const [leaderboard, matches, codes, users, settings] = await Promise.all([
    buildLeaderboard(),
    Match.find({}).sort({ matchDate: 1 }).populate("homeTeamId awayTeamId").lean(),
    (await import("@/models/InviteCode")).InviteCode.find({}).sort({ createdAt: -1 }).lean(),
    User.find({}).sort({ createdAt: -1 }).lean(),
    TournamentSettings.findOne().lean(),
  ]);
  const normalizedSettings = getNormalizedSettings(settings);
  const firstMatchDate = getFirstMatchDate(matches);

  return {
    leaderboard,
    matches: matches.map((match) => serializeMatch(match, normalizedSettings, firstMatchDate)),
    inviteCodes: codes.map((code) => ({
      _id: String(code._id),
      code: code.code,
      status: code.status,
      usedAt: code.usedAt ?? null,
    })),
    users: users.map((user) => ({
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    })),
    settings,
  };
}
