export const defaultMatchScoring = {
  exactScorePoints: 5,
  winnerPoints: 3,
  drawPoints: 3,
  lossPoints: 0,
} as const;

export const defaultAnticipationScoring = {
  groupQualifiedPoints: 2,
  bestThirdPoints: 2,
  roundOf16Points: 5,
  quarterFinalPoints: 10,
  semiFinalPoints: 15,
  finalPoints: 25,
  championPoints: 35,
} as const;
