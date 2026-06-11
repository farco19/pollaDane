/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnticipationAvailabilityMode, PredictionCutoffMode } from "@/types/domain";

const PREDICTION_BUFFER_MS = 15 * 60 * 1000;

export function getFirstMatchDate(matches: Array<{ matchDate: string | Date }>) {
  if (!matches.length) {
    return null;
  }

  return matches.reduce<Date | null>((earliest, match) => {
    const current = new Date(match.matchDate);
    if (!earliest || current.getTime() < earliest.getTime()) {
      return current;
    }
    return earliest;
  }, null);
}

export function getPredictionCloseTime(params: {
  mode: PredictionCutoffMode;
  matchDate: string | Date;
  firstMatchDate: string | Date | null;
}) {
  if (params.mode === "first_match_start" && params.firstMatchDate) {
    return new Date(new Date(params.firstMatchDate).getTime() - PREDICTION_BUFFER_MS);
  }

  return new Date(new Date(params.matchDate).getTime() - PREDICTION_BUFFER_MS);
}

export function isPredictionClosed(params: {
  mode: PredictionCutoffMode;
  matchDate: string | Date;
  firstMatchDate: string | Date | null;
  now?: number;
}) {
  const closeAt = getPredictionCloseTime(params);
  return closeAt.getTime() <= (params.now ?? Date.now());
}

export function isAnticipationLocked(params: {
  mode?: AnticipationAvailabilityMode | null;
  firstMatchDate: string | Date | null;
  now?: number;
}) {
  if (params.mode === "manual_open") {
    return false;
  }

  if (params.mode === "manual_locked") {
    return true;
  }

  return params.firstMatchDate ? new Date(params.firstMatchDate).getTime() <= (params.now ?? Date.now()) : false;
}

function getMatchWinner(match: any) {
  if (match.homeScore == null || match.awayScore == null || match.status !== "finished") {
    return null;
  }

  if (match.homeScore === match.awayScore) {
    return null;
  }

  return match.homeScore > match.awayScore ? String(match.homeTeamId?._id ?? match.homeTeamId) : String(match.awayTeamId?._id ?? match.awayTeamId);
}

type GroupStandingEntry = {
  teamId: string;
  played: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
};

type ThirdPlaceStandingEntry = GroupStandingEntry & {
  group: string;
};

export function getQualifiedTeamIdsByStage(matches: any[], stage: string) {
  const teamIds = new Set<string>();

  for (const match of matches.filter((item) => item.stage === stage)) {
    if (match.homeTeamId) {
      teamIds.add(String(match.homeTeamId?._id ?? match.homeTeamId));
    }
    if (match.awayTeamId) {
      teamIds.add(String(match.awayTeamId?._id ?? match.awayTeamId));
    }
  }

  return Array.from(teamIds);
}

export function getChampionTeamId(matches: any[]) {
  const finalMatch = matches.find((match) => match.stage === "final");
  return finalMatch ? getMatchWinner(finalMatch) : null;
}

function sortStandings(a: GroupStandingEntry, b: GroupStandingEntry) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId, "es");
}

export function getGroupStandings(matches: any[], options?: { requireCompleted?: boolean }) {
  const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
  const grouped = new Map<string, any[]>();
  const requireCompleted = options?.requireCompleted ?? true;

  for (const match of groupMatches) {
    const group = String(match.group);
    grouped.set(group, [...(grouped.get(group) ?? []), match]);
  }

  const result = new Map<string, GroupStandingEntry[]>();

  for (const [group, items] of grouped.entries()) {
    if (!items.length || (requireCompleted && items.some((match) => match.status !== "finished"))) {
      continue;
    }

    const table = new Map<string, { teamId: string; played: number; points: number; goalDifference: number; goalsFor: number; goalsAgainst: number }>();

    for (const match of items) {
      const homeTeamId = String(match.homeTeamId?._id ?? match.homeTeamId);
      const awayTeamId = String(match.awayTeamId?._id ?? match.awayTeamId);
      const home = table.get(homeTeamId) ?? { teamId: homeTeamId, played: 0, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
      const away = table.get(awayTeamId) ?? { teamId: awayTeamId, played: 0, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
      const matchFinished = match.status === "finished";
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      if (matchFinished) {
        home.played += 1;
        away.played += 1;
        home.goalDifference += homeScore - awayScore;
        away.goalDifference += awayScore - homeScore;
        home.goalsFor += homeScore;
        away.goalsFor += awayScore;
        home.goalsAgainst += awayScore;
        away.goalsAgainst += homeScore;

        if (homeScore > awayScore) {
          home.points += 3;
        } else if (awayScore > homeScore) {
          away.points += 3;
        } else {
          home.points += 1;
          away.points += 1;
        }
      }

      table.set(homeTeamId, home);
      table.set(awayTeamId, away);
    }

    result.set(group, Array.from(table.values()).sort(sortStandings));
  }

  return result;
}

export function getGroupTopTwo(matches: any[]) {
  const standings = getGroupStandings(matches, { requireCompleted: true });
  const result = new Map<string, string[]>();

  for (const [group, items] of standings.entries()) {
    result.set(
      group,
      items.slice(0, 2).map((entry) => entry.teamId),
    );
  }

  return result;
}

export function getThirdPlaceStandings(matches: any[], options?: { requireCompleted?: boolean }) {
  const standings = getGroupStandings(matches, options);

  return Array.from(standings.entries())
    .map(([group, items]) => {
      const thirdPlace = items[2];
      return thirdPlace ? { ...thirdPlace, group } : null;
    })
    .filter((entry): entry is ThirdPlaceStandingEntry => Boolean(entry))
    .sort(sortStandings);
}

export function getBestThirdTeamIds(matches: any[], limit = 8) {
  const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
  const groupNames = new Set(groupMatches.map((match) => String(match.group)));
  const thirdPlaceTeams = getThirdPlaceStandings(matches, { requireCompleted: true });

  if (!groupNames.size || thirdPlaceTeams.length !== groupNames.size) {
    return [];
  }

  if (thirdPlaceTeams.length < limit) {
    return [];
  }

  return thirdPlaceTeams.slice(0, limit).map((entry) => entry.teamId);
}

export function getOfficialBestThirdTeamIds(
  settings?: { officialBestThirdTeamIds?: Array<string | { toString(): string } | null | undefined> | null } | null,
) {
  return Array.from(
    new Set(
      (settings?.officialBestThirdTeamIds ?? [])
        .map((teamId) => (teamId ? teamId.toString() : ""))
        .filter(Boolean),
    ),
  );
}

export function getCurrentGroupStandings(matches: any[]) {
  return getGroupStandings(matches, { requireCompleted: false });
}
