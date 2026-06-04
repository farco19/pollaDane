export const defaultPrizeDistribution = {
  firstPlacePercentage: 60,
  secondPlacePercentage: 25,
  thirdPlacePercentage: 15,
} as const;

export function calculatePrizePool(entryFee: number, participantCount: number) {
  return entryFee * participantCount;
}

export function calculatePrizeDistributionAmounts(
  prizePool: number,
  distribution: {
    firstPlacePercentage: number;
    secondPlacePercentage: number;
    thirdPlacePercentage: number;
  },
) {
  const firstPlaceAmount = Math.round(prizePool * (distribution.firstPlacePercentage / 100));
  const secondPlaceAmount = Math.round(prizePool * (distribution.secondPlacePercentage / 100));
  const thirdPlaceAmount = Math.max(0, prizePool - firstPlaceAmount - secondPlaceAmount);

  return {
    firstPlaceAmount,
    secondPlaceAmount,
    thirdPlaceAmount,
  };
}
