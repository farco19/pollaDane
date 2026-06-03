/* eslint-disable @typescript-eslint/no-explicit-any */
import { getChampionTeamId, getGroupTopTwo, getQualifiedTeamIdsByStage } from "@/lib/server/tournament";

export function buildAnticipationActuals(matches: any[]) {
  return {
    groupTopTwo: getGroupTopTwo(matches),
    roundOf16TeamIds: new Set(getQualifiedTeamIdsByStage(matches, "round_of_16")),
    quarterFinalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "quarter_final")),
    semiFinalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "semi_final")),
    finalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "final")),
    championTeamId: getChampionTeamId(matches),
  };
}

export function calculateAnticipationPoints(
  prediction: any,
  actuals: ReturnType<typeof buildAnticipationActuals>,
  scoring: {
    groupQualifiedPoints: number;
    roundOf16Points: number;
    quarterFinalPoints: number;
    semiFinalPoints: number;
    finalPoints: number;
    championPoints: number;
  },
) {
  let totalPoints = 0;

  for (const groupPrediction of prediction.groupRankings ?? []) {
    const actualTopTwo = actuals.groupTopTwo.get(groupPrediction.group) ?? [];

    if (groupPrediction.firstTeamId && actualTopTwo.includes(String(groupPrediction.firstTeamId))) {
      totalPoints += scoring.groupQualifiedPoints;
    }

    if (groupPrediction.secondTeamId && actualTopTwo.includes(String(groupPrediction.secondTeamId))) {
      totalPoints += scoring.groupQualifiedPoints;
    }
  }

  for (const teamId of prediction.stageSelections?.roundOf16TeamIds ?? []) {
    if (actuals.roundOf16TeamIds.has(String(teamId))) {
      totalPoints += scoring.roundOf16Points;
    }
  }

  for (const teamId of prediction.stageSelections?.quarterFinalTeamIds ?? []) {
    if (actuals.quarterFinalTeamIds.has(String(teamId))) {
      totalPoints += scoring.quarterFinalPoints;
    }
  }

  for (const teamId of prediction.stageSelections?.semiFinalTeamIds ?? []) {
    if (actuals.semiFinalTeamIds.has(String(teamId))) {
      totalPoints += scoring.semiFinalPoints;
    }
  }

  for (const teamId of prediction.stageSelections?.finalTeamIds ?? []) {
    if (actuals.finalTeamIds.has(String(teamId))) {
      totalPoints += scoring.finalPoints;
    }
  }

  if (prediction.stageSelections?.championTeamId && actuals.championTeamId === String(prediction.stageSelections.championTeamId)) {
    totalPoints += scoring.championPoints;
  }

  return totalPoints;
}
