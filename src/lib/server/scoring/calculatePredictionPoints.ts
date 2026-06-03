export function calculatePredictionPoints(
  predictedHomeScore: number,
  predictedAwayScore: number,
  realHomeScore: number,
  realAwayScore: number,
  scoring: {
    exactScorePoints: number;
    winnerPoints: number;
    drawPoints: number;
    lossPoints: number;
  },
) {
  const exact =
    predictedHomeScore === realHomeScore && predictedAwayScore === realAwayScore;

  if (exact) {
    return scoring.exactScorePoints;
  }

  const predictedDraw = predictedHomeScore === predictedAwayScore;
  const realDraw = realHomeScore === realAwayScore;

  if (predictedDraw && realDraw) {
    return scoring.drawPoints;
  }

  const predictedWinner = predictedHomeScore > predictedAwayScore ? "home" : "away";
  const realWinner = realHomeScore > realAwayScore ? "home" : "away";

  if (!predictedDraw && !realDraw && predictedWinner === realWinner) {
    return scoring.winnerPoints;
  }

  return scoring.lossPoints;
}
