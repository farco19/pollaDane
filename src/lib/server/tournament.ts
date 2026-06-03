/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PredictionCutoffMode } from "@/types/domain";

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
  points: number;
  goalDifference: number;
  goalsFor: number;
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

export function getGroupStandings(matches: any[]) {
  const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
  const grouped = new Map<string, any[]>();

  for (const match of groupMatches) {
    const group = String(match.group);
    grouped.set(group, [...(grouped.get(group) ?? []), match]);
  }

  const result = new Map<string, GroupStandingEntry[]>();

  for (const [group, items] of grouped.entries()) {
    if (!items.length || items.some((match) => match.status !== "finished")) {
      continue;
    }

    const table = new Map<string, { teamId: string; points: number; goalDifference: number; goalsFor: number }>();

    for (const match of items) {
      const homeTeamId = String(match.homeTeamId?._id ?? match.homeTeamId);
      const awayTeamId = String(match.awayTeamId?._id ?? match.awayTeamId);
      const home = table.get(homeTeamId) ?? { teamId: homeTeamId, points: 0, goalDifference: 0, goalsFor: 0 };
      const away = table.get(awayTeamId) ?? { teamId: awayTeamId, points: 0, goalDifference: 0, goalsFor: 0 };
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      home.goalDifference += homeScore - awayScore;
      away.goalDifference += awayScore - homeScore;
      home.goalsFor += homeScore;
      away.goalsFor += awayScore;

      if (homeScore > awayScore) {
        home.points += 3;
      } else if (awayScore > homeScore) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }

      table.set(homeTeamId, home);
      table.set(awayTeamId, away);
    }

    result.set(group, Array.from(table.values()).sort(sortStandings));
  }

  return result;
}

export function getGroupTopTwo(matches: any[]) {
  const standings = getGroupStandings(matches);
  const result = new Map<string, string[]>();

  for (const [group, items] of standings.entries()) {
    result.set(
      group,
      items.slice(0, 2).map((entry) => entry.teamId),
    );
  }

  return result;
}

export function getBestThirdTeamIds(matches: any[], limit = 8) {
  const standings = getGroupStandings(matches);
  const groupMatches = matches.filter((match) => match.stage === "group" && match.group);
  const groupNames = new Set(groupMatches.map((match) => String(match.group)));

  if (!groupNames.size || standings.size !== groupNames.size) {
    return [];
  }

  const thirdPlaceTeams = Array.from(standings.values())
    .map((items) => items[2] ?? null)
    .filter((entry): entry is GroupStandingEntry => Boolean(entry))
    .sort(sortStandings);

  if (thirdPlaceTeams.length < limit) {
    return [];
  }

  return thirdPlaceTeams.slice(0, limit).map((entry) => entry.teamId);
}
