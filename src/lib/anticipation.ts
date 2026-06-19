export const anticipationStageLimits = {
  bestThirdTeamIds: 8,
  roundOf32TeamIds: 32,
  roundOf16TeamIds: 16,
  quarterFinalTeamIds: 8,
  semiFinalTeamIds: 4,
  finalTeamIds: 2,
} as const;

export type AnticipationFormShape = {
  groupRankings: Array<{
    group: string;
    firstTeamId: string | null;
    secondTeamId: string | null;
  }>;
  stageSelections: {
    bestThirdTeamIds: string[];
    roundOf32TeamIds: string[];
    roundOf16TeamIds: string[];
    quarterFinalTeamIds: string[];
    semiFinalTeamIds: string[];
    finalTeamIds: string[];
    championTeamId: string | null;
  };
};

type TeamGroupLookup = Map<string, string | null | undefined> | Record<string, string | null | undefined>;

function uniqueTeamIds(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item))));
}

function getTeamGroup(teamId: string, teamGroupLookup?: TeamGroupLookup) {
  if (!teamGroupLookup) {
    return null;
  }

  if (teamGroupLookup instanceof Map) {
    return teamGroupLookup.get(teamId) ?? null;
  }

  return teamGroupLookup[teamId] ?? null;
}

function sanitizeBestThirdTeamIds(bestThirdTeamIds: string[], teamGroupLookup?: TeamGroupLookup) {
  if (!teamGroupLookup) {
    return bestThirdTeamIds;
  }

  const selectedGroups = new Set<string>();

  return bestThirdTeamIds.filter((teamId) => {
    const group = getTeamGroup(teamId, teamGroupLookup);

    if (!group || selectedGroups.has(group)) {
      return false;
    }

    selectedGroups.add(group);
    return true;
  });
}

export function getQualifiedTeamsFromGroups(groupRankings: AnticipationFormShape["groupRankings"]) {
  return uniqueTeamIds(groupRankings.flatMap((group) => [group.firstTeamId, group.secondTeamId]));
}

export function getAnticipationCandidatePools(form: AnticipationFormShape) {
  const groupQualifiedTeamIds = getQualifiedTeamsFromGroups(form.groupRankings);
  const bestThirdTeamIds = uniqueTeamIds(form.stageSelections.bestThirdTeamIds).filter((teamId) => !groupQualifiedTeamIds.includes(teamId));
  const roundOf32CandidateIds = uniqueTeamIds([...groupQualifiedTeamIds, ...bestThirdTeamIds]);
  const roundOf16CandidateIds = roundOf32CandidateIds;
  const quarterFinalCandidateIds = uniqueTeamIds(form.stageSelections.roundOf16TeamIds);
  const semiFinalCandidateIds = uniqueTeamIds(form.stageSelections.quarterFinalTeamIds);
  const finalCandidateIds = uniqueTeamIds(form.stageSelections.semiFinalTeamIds);

  return {
    groupQualifiedTeamIds,
    bestThirdTeamIds,
    roundOf32CandidateIds,
    roundOf16CandidateIds,
    quarterFinalCandidateIds,
    semiFinalCandidateIds,
    finalCandidateIds,
  };
}

export function sanitizeAnticipationForm(form: AnticipationFormShape, options?: { teamGroupLookup?: TeamGroupLookup }): AnticipationFormShape {
  const groupQualifiedTeamIds = getQualifiedTeamsFromGroups(form.groupRankings);
  const bestThirdTeamIds = sanitizeBestThirdTeamIds(
    uniqueTeamIds(form.stageSelections.bestThirdTeamIds).filter((teamId) => !groupQualifiedTeamIds.includes(teamId)),
    options?.teamGroupLookup,
  ).slice(0, anticipationStageLimits.bestThirdTeamIds);
  const roundOf32TeamIds = uniqueTeamIds([...groupQualifiedTeamIds, ...bestThirdTeamIds]).slice(0, anticipationStageLimits.roundOf32TeamIds);
  const roundOf16CandidateIds = new Set(roundOf32TeamIds);
  const roundOf16TeamIds = uniqueTeamIds(form.stageSelections.roundOf16TeamIds)
    .filter((teamId) => roundOf16CandidateIds.has(teamId))
    .slice(0, anticipationStageLimits.roundOf16TeamIds);
  const quarterFinalCandidateIds = new Set(roundOf16TeamIds);
  const quarterFinalTeamIds = uniqueTeamIds(form.stageSelections.quarterFinalTeamIds)
    .filter((teamId) => quarterFinalCandidateIds.has(teamId))
    .slice(0, anticipationStageLimits.quarterFinalTeamIds);
  const semiFinalCandidateIds = new Set(quarterFinalTeamIds);
  const semiFinalTeamIds = uniqueTeamIds(form.stageSelections.semiFinalTeamIds)
    .filter((teamId) => semiFinalCandidateIds.has(teamId))
    .slice(0, anticipationStageLimits.semiFinalTeamIds);
  const finalCandidateIds = new Set(semiFinalTeamIds);
  const finalTeamIds = uniqueTeamIds(form.stageSelections.finalTeamIds)
    .filter((teamId) => finalCandidateIds.has(teamId))
    .slice(0, anticipationStageLimits.finalTeamIds);
  const championTeamId =
    form.stageSelections.championTeamId && finalTeamIds.includes(form.stageSelections.championTeamId) ? form.stageSelections.championTeamId : null;

  return {
    groupRankings: form.groupRankings,
    stageSelections: {
      bestThirdTeamIds,
      roundOf32TeamIds,
      roundOf16TeamIds,
      quarterFinalTeamIds,
      semiFinalTeamIds,
      finalTeamIds,
      championTeamId,
    },
  };
}
