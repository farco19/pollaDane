import type { MatchStatus } from "@/types/domain";
import { getColombiaDateKey } from "@/lib/match-datetime";
import { connectToDatabase } from "@/lib/db";
import { applyMatchResult, bootstrapDataLayer } from "@/lib/server/data";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { sendMatchResultNotifications } from "@/lib/server/push";
import { Match } from "@/models/Match";
import { TournamentSettings } from "@/models/TournamentSettings";

const API_FOOTBALL_BASE_URL = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID ?? "1";
const API_FOOTBALL_SEASON = process.env.API_FOOTBALL_SEASON ?? "2026";
const GLOBAL_SYNC_LOCK_MS = 60 * 1000;
const PER_MATCH_REQUEST_LIMIT = 25;
const MATCH_TRACKING_WINDOW_MS = 150 * 60 * 1000;
const PER_MATCH_POLL_INTERVAL_MS = Math.ceil(MATCH_TRACKING_WINDOW_MS / PER_MATCH_REQUEST_LIMIT);
const EXTERNAL_FETCH_TIMEOUT_MS = 10 * 1000;
const API_FOOTBALL_PROVIDER = "API-Football";
const API_FOOTBALL_TIMEZONE = "America/Bogota";

type ApiFootballFixtureResponse = {
  response?: ApiFootballFixture[];
};

type ApiFootballFixture = {
  fixture?: {
    id?: number;
    date?: string | null;
    status?: {
      short?: string | null;
      long?: string | null;
      elapsed?: number | null;
    } | null;
  } | null;
  teams?: {
    home?: {
      name?: string | null;
    } | null;
    away?: {
      name?: string | null;
    } | null;
  } | null;
  goals?: {
    home?: number | null;
    away?: number | null;
  } | null;
};

type LocalMatchWithTeams = {
  _id: string | { toString(): string };
  matchDate: Date;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamId?: {
    code?: string | null;
    name?: string | null;
  } | null;
  awayTeamId?: {
    code?: string | null;
    name?: string | null;
  } | null;
  liveSync?: {
    provider?: string | null;
    externalFixtureId?: number | null;
    trackingStartedAt?: Date | null;
    lastPolledAt?: Date | null;
    requestCount?: number;
  } | null;
};

export type LiveSyncSummary = {
  attempted: boolean;
  skipped: boolean;
  updatedLiveCount: number;
  finalizedCount: number;
  error: string | null;
  lastSuccessAt: Date | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getTeamAliases(code: string | null | undefined, name: string | null | undefined) {
  const normalizedName = normalizeText(name);
  const aliases = new Set<string>();
  if (normalizedName) {
    aliases.add(normalizedName);
  }

  const aliasMap: Record<string, string[]> = {
    BIH: ["bosnia and herzegovina", "bosnia herzegovina"],
    CIV: ["ivory coast", "cote d ivoire", "cote divoire"],
    COD: ["democratic republic of the congo", "dr congo", "congo dr"],
    CPV: ["cape verde", "cabo verde"],
    CUW: ["curacao", "curaçao"],
    CZE: ["czech republic", "czechia"],
    IRN: ["iran", "iran ir"],
    KOR: ["south korea", "korea republic"],
    KSA: ["saudi arabia"],
    TUR: ["turkey", "turkiye"],
    USA: ["united states", "usa", "united states of america"],
  };

  for (const alias of aliasMap[String(code ?? "").toUpperCase()] ?? []) {
    aliases.add(normalizeText(alias));
  }

  return aliases;
}

function getFixtureStatusShort(fixture: ApiFootballFixture) {
  return String(fixture.fixture?.status?.short ?? "").trim().toUpperCase();
}

function getFixtureStatus(fixture: ApiFootballFixture): MatchStatus {
  const status = getFixtureStatusShort(fixture);
  if (["FT", "AET", "PEN"].includes(status)) {
    return "finished";
  }

  if (["NS", "TBD", "PST", "CANC", "ABD", "AWD", "WO"].includes(status)) {
    return "scheduled";
  }

  return "live";
}

function getFixtureId(fixture: ApiFootballFixture) {
  return fixture.fixture?.id ?? null;
}

function getFixtureDate(fixture: ApiFootballFixture) {
  const value = fixture.fixture?.date;
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMatchId(match: LocalMatchWithTeams) {
  return String(match._id);
}

function getRequestCount(match: LocalMatchWithTeams) {
  return Math.max(0, match.liveSync?.requestCount ?? 0);
}

function getExternalFixtureId(match: LocalMatchWithTeams) {
  return match.liveSync?.externalFixtureId ?? null;
}

function isTrackingEligible(match: LocalMatchWithTeams, now: Date) {
  const matchTime = new Date(match.matchDate).getTime();
  const nowTime = now.getTime();
  return nowTime >= matchTime && nowTime <= matchTime + MATCH_TRACKING_WINDOW_MS;
}

function isMatchEligibleForPoll(match: LocalMatchWithTeams, now: Date) {
  if (!isTrackingEligible(match, now)) {
    return false;
  }

  if (match.status === "finished") {
    return false;
  }

  if (getRequestCount(match) >= PER_MATCH_REQUEST_LIMIT) {
    return false;
  }

  const lastPolledAt = match.liveSync?.lastPolledAt ? new Date(match.liveSync.lastPolledAt) : null;
  if (!lastPolledAt) {
    return true;
  }

  return now.getTime() - lastPolledAt.getTime() >= PER_MATCH_POLL_INTERVAL_MS;
}

function fixtureMatchesLocalMatch(fixture: ApiFootballFixture, match: LocalMatchWithTeams) {
  const localHomeAliases = getTeamAliases(match.homeTeamId?.code ?? null, match.homeTeamId?.name ?? null);
  const localAwayAliases = getTeamAliases(match.awayTeamId?.code ?? null, match.awayTeamId?.name ?? null);
  const fixtureHome = normalizeText(fixture.teams?.home?.name);
  const fixtureAway = normalizeText(fixture.teams?.away?.name);

  if (localHomeAliases.has(fixtureHome) && localAwayAliases.has(fixtureAway)) {
    return true;
  }

  const fixtureDate = getFixtureDate(fixture);
  if (!fixtureDate) {
    return false;
  }

  const timeDiff = Math.abs(fixtureDate.getTime() - new Date(match.matchDate).getTime());
  return timeDiff <= 3 * 60 * 60 * 1000 && localHomeAliases.has(fixtureHome) && localAwayAliases.has(fixtureAway);
}

function buildApiFootballUrl(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(path, API_FOOTBALL_BASE_URL.endsWith("/") ? API_FOOTBALL_BASE_URL : `${API_FOOTBALL_BASE_URL}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchApiFootball<T>(path: string, query: Record<string, string | number | undefined>) {
  if (!API_FOOTBALL_KEY) {
    throw new Error("Falta configurar API_FOOTBALL_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiFootballUrl(path, query), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "x-apisports-key": API_FOOTBALL_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Respuesta invalida de API-Football (${response.status})`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function acquireSyncWindow() {
  await connectToDatabase();

  const now = new Date();
  const threshold = new Date(now.getTime() - GLOBAL_SYNC_LOCK_MS);
  const settings = await TournamentSettings.findOneAndUpdate(
    {
      $or: [
        { "liveSync.lastAttemptAt": { $exists: false } },
        { "liveSync.lastAttemptAt": null },
        { "liveSync.lastAttemptAt": { $lt: threshold } },
      ],
    },
    {
      $set: {
        "liveSync.lastAttemptAt": now,
      },
    },
    { new: true },
  ).lean();

  return settings;
}

async function updateSyncStatus(params: { error?: string | null; success?: boolean }) {
  const update: Record<string, unknown> = {
    "liveSync.lastError": params.error ?? null,
  };

  if (params.success) {
    update["liveSync.lastSuccessAt"] = new Date();
  }

  await TournamentSettings.updateOne({}, { $set: update });
}

async function markMatchesPolled(matchIds: string[], now: Date) {
  if (!matchIds.length) {
    return;
  }

  await Match.updateMany(
    { _id: { $in: matchIds } },
    {
      $set: {
        "liveSync.provider": API_FOOTBALL_PROVIDER,
        "liveSync.lastPolledAt": now,
      },
      $inc: {
        "liveSync.requestCount": 1,
      },
      $setOnInsert: {},
    },
  );

  await Match.updateMany(
    {
      _id: { $in: matchIds },
      $or: [{ "liveSync.trackingStartedAt": null }, { "liveSync.trackingStartedAt": { $exists: false } }],
    },
    {
      $set: {
        "liveSync.trackingStartedAt": now,
      },
    },
  );
}

async function setFixtureId(matchId: string, fixtureId: number) {
  await Match.updateOne(
    { _id: matchId },
    {
      $set: {
        "liveSync.provider": API_FOOTBALL_PROVIDER,
        "liveSync.externalFixtureId": fixtureId,
      },
    },
  );
}

async function applyFixtureState(match: LocalMatchWithTeams, fixture: ApiFootballFixture) {
  const externalStatus = getFixtureStatus(fixture);
  const homeScore = fixture.goals?.home ?? null;
  const awayScore = fixture.goals?.away ?? null;
  const matchId = getMatchId(match);
  const fixtureId = getFixtureId(fixture);

  if (fixtureId != null) {
    await setFixtureId(matchId, fixtureId);
  }

  if (match.status === "finished") {
    return { updatedLiveCount: 0, finalizedCount: 0 };
  }

  if (externalStatus === "finished") {
    if (homeScore == null || awayScore == null) {
      return { updatedLiveCount: 0, finalizedCount: 0 };
    }

    const leaderboardBefore = await buildLeaderboard();
    const updatedMatch = await applyMatchResult(matchId, homeScore, awayScore);
    const leaderboardAfter = await buildLeaderboard();
    await sendMatchResultNotifications({
      matchId: String(updatedMatch._id),
      leaderboardBefore,
      leaderboardAfter,
    });
    return { updatedLiveCount: 0, finalizedCount: 1 };
  }

  const nextValues: Record<string, unknown> = {
    "liveSync.provider": API_FOOTBALL_PROVIDER,
  };
  if (externalStatus === "live" && match.status !== "live") {
    nextValues.status = "live";
  }
  if (externalStatus === "scheduled" && match.status === "live") {
    nextValues.status = "scheduled";
    nextValues.homeScore = null;
    nextValues.awayScore = null;
  } else {
    if (homeScore != null && homeScore !== match.homeScore) {
      nextValues.homeScore = homeScore;
    }
    if (awayScore != null && awayScore !== match.awayScore) {
      nextValues.awayScore = awayScore;
    }
  }

  if (Object.keys(nextValues).length > 1 || nextValues.status) {
    await Match.updateOne({ _id: matchId, status: { $ne: "finished" } }, { $set: nextValues });
    return { updatedLiveCount: 1, finalizedCount: 0 };
  }

  return { updatedLiveCount: 0, finalizedCount: 0 };
}

async function fetchLiveFixtures() {
  const payload = await fetchApiFootball<ApiFootballFixtureResponse>("fixtures", {
    live: API_FOOTBALL_LEAGUE_ID,
    timezone: API_FOOTBALL_TIMEZONE,
  });
  return payload.response ?? [];
}

async function fetchFixtureById(fixtureId: number) {
  const payload = await fetchApiFootball<ApiFootballFixtureResponse>("fixtures", {
    id: fixtureId,
    timezone: API_FOOTBALL_TIMEZONE,
  });
  return payload.response?.[0] ?? null;
}

async function discoverFixturesByDate(date: string) {
  const payload = await fetchApiFootball<ApiFootballFixtureResponse>("fixtures", {
    league: API_FOOTBALL_LEAGUE_ID,
    season: API_FOOTBALL_SEASON,
    date,
    timezone: API_FOOTBALL_TIMEZONE,
  });
  return payload.response ?? [];
}

export async function syncExternalLiveMatchesIfNeeded(): Promise<LiveSyncSummary> {
  await bootstrapDataLayer();

  const syncWindow = await acquireSyncWindow();
  if (!syncWindow) {
    const latestSettings = await TournamentSettings.findOne().lean();
    return {
      attempted: false,
      skipped: true,
      updatedLiveCount: 0,
      finalizedCount: 0,
      error: latestSettings?.liveSync?.lastError ?? null,
      lastSuccessAt: latestSettings?.liveSync?.lastSuccessAt ?? null,
    };
  }

  try {
    const now = new Date();
    const localMatches = await Match.find({})
      .select({
        matchDate: 1,
        status: 1,
        homeScore: 1,
        awayScore: 1,
        homeTeamId: 1,
        awayTeamId: 1,
        liveSync: 1,
      })
      .populate("homeTeamId awayTeamId", "code name")
      .lean<LocalMatchWithTeams[]>();

    const eligibleMatches = localMatches.filter((match) => isMatchEligibleForPoll(match, now));
    if (!eligibleMatches.length) {
      const latestSettings = await TournamentSettings.findOne().lean();
      return {
        attempted: false,
        skipped: true,
        updatedLiveCount: 0,
        finalizedCount: 0,
        error: latestSettings?.liveSync?.lastError ?? null,
        lastSuccessAt: latestSettings?.liveSync?.lastSuccessAt ?? null,
      };
    }

    let updatedLiveCount = 0;
    let finalizedCount = 0;

    const liveSnapshot = await fetchLiveFixtures();
    const matchedLiveIds = new Set<string>();
    await markMatchesPolled(
      eligibleMatches
        .filter((match) => match.status === "live" || getExternalFixtureId(match) == null)
        .map((match) => getMatchId(match)),
      now,
    );

    for (const match of eligibleMatches) {
      const matchedFixture =
        liveSnapshot.find((fixture) => {
          const fixtureId = getFixtureId(fixture);
          return fixtureId != null && fixtureId === getExternalFixtureId(match);
        }) ??
        liveSnapshot.find((fixture) => fixtureMatchesLocalMatch(fixture, match));

      if (!matchedFixture) {
        continue;
      }

      matchedLiveIds.add(getMatchId(match));
      const result = await applyFixtureState(match, matchedFixture);
      updatedLiveCount += result.updatedLiveCount;
      finalizedCount += result.finalizedCount;
    }

    const trackedMatches = eligibleMatches.filter(
      (match) => !matchedLiveIds.has(getMatchId(match)) && getExternalFixtureId(match) != null,
    );
    for (const match of trackedMatches) {
      const fixtureId = getExternalFixtureId(match);
      if (fixtureId == null) {
        continue;
      }

      await markMatchesPolled([getMatchId(match)], now);
      const fixture = await fetchFixtureById(fixtureId);
      if (!fixture) {
        continue;
      }

      const result = await applyFixtureState(match, fixture);
      updatedLiveCount += result.updatedLiveCount;
      finalizedCount += result.finalizedCount;
    }

    const needsDiscovery = eligibleMatches.filter(
      (match) => !matchedLiveIds.has(getMatchId(match)) && getExternalFixtureId(match) == null,
    );
    const discoveryDates = Array.from(new Set(needsDiscovery.map((match) => getColombiaDateKey(match.matchDate))));
    for (const date of discoveryDates) {
      const matchesForDate = needsDiscovery.filter((match) => getColombiaDateKey(match.matchDate) === date);
      if (!matchesForDate.length) {
        continue;
      }

      await markMatchesPolled(matchesForDate.map((match) => getMatchId(match)), now);
      const fixtures = await discoverFixturesByDate(date);
      for (const match of matchesForDate) {
        const fixture = fixtures.find((item) => fixtureMatchesLocalMatch(item, match));
        if (!fixture) {
          continue;
        }

        const result = await applyFixtureState(match, fixture);
        updatedLiveCount += result.updatedLiveCount;
        finalizedCount += result.finalizedCount;
      }
    }

    await updateSyncStatus({ success: true, error: null });
    const latestSettings = await TournamentSettings.findOne().lean();
    return {
      attempted: true,
      skipped: false,
      updatedLiveCount,
      finalizedCount,
      error: null,
      lastSuccessAt: latestSettings?.liveSync?.lastSuccessAt ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible sincronizar resultados live";
    await updateSyncStatus({ success: false, error: message });
    const latestSettings = await TournamentSettings.findOne().lean();
    return {
      attempted: true,
      skipped: false,
      updatedLiveCount: 0,
      finalizedCount: 0,
      error: message,
      lastSuccessAt: latestSettings?.liveSync?.lastSuccessAt ?? null,
    };
  }
}
