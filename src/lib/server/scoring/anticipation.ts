/* eslint-disable @typescript-eslint/no-explicit-any */
import { getChampionTeamId, getGroupTopTwo, getOfficialBestThirdTeamIds, getQualifiedTeamIdsByStage } from "@/lib/server/tournament";

function hasStageMatches(matches: any[], stage: string) {
  return matches.some((match) => match.stage === stage);
}

export function buildAnticipationActuals(
  matches: any[],
  settings?: { officialBestThirdTeamIds?: Array<string | { toString(): string } | null | undefined> | null } | null,
) {
  const championTeamId = getChampionTeamId(matches);

  return {
    activation: {
      groupQualified: hasStageMatches(matches, "round_of_32"),
      bestThird: hasStageMatches(matches, "round_of_32"),
      roundOf16: hasStageMatches(matches, "round_of_16"),
      quarterFinal: hasStageMatches(matches, "quarter_final"),
      semiFinal: hasStageMatches(matches, "semi_final"),
      final: hasStageMatches(matches, "final"),
      champion: Boolean(championTeamId),
    },
    groupTopTwo: getGroupTopTwo(matches),
    bestThirdTeamIds: new Set(getOfficialBestThirdTeamIds(settings)),
    roundOf16TeamIds: new Set(getQualifiedTeamIdsByStage(matches, "round_of_16")),
    quarterFinalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "quarter_final")),
    semiFinalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "semi_final")),
    finalTeamIds: new Set(getQualifiedTeamIdsByStage(matches, "final")),
    championTeamId,
  };
}

export function calculateAnticipationPoints(
  prediction: any,
  actuals: ReturnType<typeof buildAnticipationActuals>,
  scoring: {
    groupQualifiedPoints: number;
    bestThirdPoints: number;
    roundOf16Points: number;
    quarterFinalPoints: number;
    semiFinalPoints: number;
    finalPoints: number;
    championPoints: number;
  },
) {
  let totalPoints = 0;

  if (actuals.activation.groupQualified) {
    for (const groupPrediction of prediction.groupRankings ?? []) {
      const actualTopTwo = actuals.groupTopTwo.get(groupPrediction.group) ?? [];

      if (groupPrediction.firstTeamId && actualTopTwo.includes(String(groupPrediction.firstTeamId))) {
        totalPoints += scoring.groupQualifiedPoints;
      }

      if (groupPrediction.secondTeamId && actualTopTwo.includes(String(groupPrediction.secondTeamId))) {
        totalPoints += scoring.groupQualifiedPoints;
      }
    }
  }

  if (actuals.activation.bestThird) {
    for (const teamId of prediction.stageSelections?.bestThirdTeamIds ?? []) {
      if (actuals.bestThirdTeamIds.has(String(teamId))) {
        totalPoints += scoring.bestThirdPoints;
      }
    }
  }

  if (actuals.activation.roundOf16) {
    for (const teamId of prediction.stageSelections?.roundOf16TeamIds ?? []) {
      if (actuals.roundOf16TeamIds.has(String(teamId))) {
        totalPoints += scoring.roundOf16Points;
      }
    }
  }

  if (actuals.activation.quarterFinal) {
    for (const teamId of prediction.stageSelections?.quarterFinalTeamIds ?? []) {
      if (actuals.quarterFinalTeamIds.has(String(teamId))) {
        totalPoints += scoring.quarterFinalPoints;
      }
    }
  }

  if (actuals.activation.semiFinal) {
    for (const teamId of prediction.stageSelections?.semiFinalTeamIds ?? []) {
      if (actuals.semiFinalTeamIds.has(String(teamId))) {
        totalPoints += scoring.semiFinalPoints;
      }
    }
  }

  if (actuals.activation.final) {
    for (const teamId of prediction.stageSelections?.finalTeamIds ?? []) {
      if (actuals.finalTeamIds.has(String(teamId))) {
        totalPoints += scoring.finalPoints;
      }
    }
  }

  if (
    actuals.activation.champion &&
    prediction.stageSelections?.championTeamId &&
    actuals.championTeamId === String(prediction.stageSelections.championTeamId)
  ) {
    totalPoints += scoring.championPoints;
  }

  return totalPoints;
}
