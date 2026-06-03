import { calculatePrizePool } from "@/lib/server/prize";
import { buildAnticipationActuals, calculateAnticipationPoints } from "@/lib/server/scoring/anticipation";
import { defaultAnticipationScoring } from "@/lib/server/scoring/rules";
import { AnticipationPrediction } from "@/models/AnticipationPrediction";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { TournamentSettings } from "@/models/TournamentSettings";
import { User } from "@/models/User";

export async function buildLeaderboard() {
  const [users, predictions, settings, matches, anticipationPredictions] = await Promise.all([
    User.find({ role: "participant", isActive: true }).lean(),
    Prediction.find({ pointsAwarded: { $ne: null } }).lean(),
    TournamentSettings.findOne().lean(),
    Match.find({}).lean(),
    AnticipationPrediction.find({}).lean(),
  ]);

  const map = new Map<string, {
    userId: string;
    name: string;
    email: string;
    totalPoints: number;
    matchPoints: number;
    exactHits: number;
    winnerHits: number;
    drawHits: number;
    predictionsScored: number;
    anticipationPoints: number;
    createdAt: Date;
  }>();

  for (const user of users) {
    map.set(String(user._id), {
      userId: String(user._id),
      name: user.name,
      email: user.email,
      totalPoints: 0,
      matchPoints: 0,
      exactHits: 0,
      winnerHits: 0,
      drawHits: 0,
      predictionsScored: 0,
      anticipationPoints: 0,
      createdAt: user.createdAt ?? new Date(),
    });
  }

  const matchMap = new Map(matches.map((match) => [String(match._id), match]));

  for (const prediction of predictions) {
    const entry = map.get(String(prediction.userId));
    const match = matchMap.get(String(prediction.matchId));

    if (!entry || prediction.pointsAwarded == null || !match || match.homeScore == null || match.awayScore == null) {
      continue;
    }

    entry.totalPoints += prediction.pointsAwarded;
    entry.matchPoints += prediction.pointsAwarded;
    entry.predictionsScored += 1;

    const isExact = prediction.predictedHomeScore === match.homeScore && prediction.predictedAwayScore === match.awayScore;
    const predictedDraw = prediction.predictedHomeScore === prediction.predictedAwayScore;
    const realDraw = match.homeScore === match.awayScore;
    const predictedWinner = prediction.predictedHomeScore > prediction.predictedAwayScore ? "home" : "away";
    const realWinner = match.homeScore > match.awayScore ? "home" : "away";

    if (isExact) {
      entry.exactHits += 1;
    } else if (predictedDraw && realDraw) {
      entry.drawHits += 1;
    } else if (!predictedDraw && !realDraw && predictedWinner === realWinner) {
      entry.winnerHits += 1;
    }
  }

  const anticipationScoring = {
    ...defaultAnticipationScoring,
    ...(settings?.anticipationScoring ?? {}),
  };
  const anticipationActuals = buildAnticipationActuals(matches);

  for (const prediction of anticipationPredictions) {
    const entry = map.get(String(prediction.userId));

    if (!entry) {
      continue;
    }

    const anticipationPoints = calculateAnticipationPoints(prediction, anticipationActuals, anticipationScoring);
    entry.totalPoints += anticipationPoints;
    entry.anticipationPoints += anticipationPoints;
  }

  const leaderboard = Array.from(map.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.winnerHits !== a.winnerHits) return b.winnerHits - a.winnerHits;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    leaderboard,
    prizePool: calculatePrizePool(settings?.entryFee ?? 0, users.length),
    entryFee: settings?.entryFee ?? 0,
    currency: settings?.currency ?? "COP",
    participants: users.length,
  };
}
