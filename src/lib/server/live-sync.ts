import type { MatchStage, MatchStatus } from "@/types/domain";
import { connectToDatabase } from "@/lib/db";
import { applyMatchResult, bootstrapDataLayer } from "@/lib/server/data";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { sendMatchResultNotifications } from "@/lib/server/push";
import { Match } from "@/models/Match";
import { TournamentSettings } from "@/models/TournamentSettings";

const EXTERNAL_GAMES_URL = "https://worldcup26.ir/get/games";
const EXTERNAL_TEAMS_URL = "https://worldcup26.ir/get/teams";
const LIVE_SYNC_INTERVAL_MS = 30 * 1000;
const EXTERNAL_FETCH_TIMEOUT_MS = 10 * 1000;

type ExternalTeamsResponse = {
  teams?: ExternalTeam[];
};

type ExternalGamesResponse = {
  games?: ExternalGame[];
};

type ExternalTeam = {
  id: string;
  fifa_code?: string | null;
  name_en?: string | null;
};

type ExternalGame = {
  id: string;
  type?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team_name_en?: string | null;
  away_team_name_en?: string | null;
  home_score?: string | number | null;
  away_score?: string | number | null;
  finished?: string | boolean | null;
  time_elapsed?: string | number | null;
};

type LocalMatchWithTeams = {
  _id: unknown;
  stage: MatchStage;
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
    .trim()
    .toLowerCase();
}

function parseScore(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFinished(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(String(value ?? ""));
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function getExternalStatus(match: ExternalGame): MatchStatus {
  if (parseFinished(match.finished)) {
    return "finished";
  }

  const elapsed = normalizeText(String(match.time_elapsed ?? ""));
  return elapsed && elapsed !== "notstarted" ? "live" : "scheduled";
}

function mapExternalStage(value: string | null | undefined): MatchStage | null {
  const normalized = normalizeText(value);

  if (normalized === "group") return "group";
  if (normalized === "r32") return "round_of_32";
  if (normalized === "r16") return "round_of_16";
  if (normalized === "qf") return "quarter_final";
  if (normalized === "sf") return "semi_final";
  if (normalized === "third") return "third_place";
  if (normalized === "final") return "final";

  return null;
}

function buildMatchKey(params: {
  stage: MatchStage | null;
  homeCode?: string | null;
  awayCode?: string | null;
  homeName?: string | null;
  awayName?: string | null;
}) {
  if (!params.stage) {
    return null;
  }

  const homeCode = normalizeText(params.homeCode);
  const awayCode = normalizeText(params.awayCode);
  if (homeCode && awayCode) {
    return `${params.stage}|${homeCode}|${awayCode}`;
  }

  const homeName = normalizeText(params.homeName);
  const awayName = normalizeText(params.awayName);
  if (homeName && awayName) {
    return `${params.stage}|${homeName}|${awayName}`;
  }

  return null;
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Respuesta invalida del proveedor externo (${response.status})`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function acquireSyncWindow() {
  await connectToDatabase();

  const now = new Date();
  const threshold = new Date(now.getTime() - LIVE_SYNC_INTERVAL_MS);
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
    const [externalTeamsResponse, externalGamesResponse, localMatches] = await Promise.all([
      fetchJson<ExternalTeamsResponse>(EXTERNAL_TEAMS_URL),
      fetchJson<ExternalGamesResponse>(EXTERNAL_GAMES_URL),
      Match.find({})
        .select({ stage: 1, status: 1, homeScore: 1, awayScore: 1, homeTeamId: 1, awayTeamId: 1 })
        .populate("homeTeamId awayTeamId", "code name")
        .lean<LocalMatchWithTeams[]>(),
    ]);

    const externalTeamMap = new Map<string, ExternalTeam>();
    for (const team of externalTeamsResponse.teams ?? []) {
      externalTeamMap.set(String(team.id), team);
    }

    const externalMatchMap = new Map<string, ExternalGame>();
    for (const game of externalGamesResponse.games ?? []) {
      const stage = mapExternalStage(game.type);
      const homeTeam = externalTeamMap.get(String(game.home_team_id ?? ""));
      const awayTeam = externalTeamMap.get(String(game.away_team_id ?? ""));
      const key = buildMatchKey({
        stage,
        homeCode: homeTeam?.fifa_code,
        awayCode: awayTeam?.fifa_code,
        homeName: game.home_team_name_en ?? homeTeam?.name_en ?? null,
        awayName: game.away_team_name_en ?? awayTeam?.name_en ?? null,
      });

      if (key) {
        externalMatchMap.set(key, game);
      }
    }

    let updatedLiveCount = 0;
    let finalizedCount = 0;

    for (const match of localMatches) {
      const key = buildMatchKey({
        stage: match.stage,
        homeCode: match.homeTeamId?.code ?? null,
        awayCode: match.awayTeamId?.code ?? null,
        homeName: match.homeTeamId?.name ?? null,
        awayName: match.awayTeamId?.name ?? null,
      });

      if (!key) {
        continue;
      }

      const externalMatch = externalMatchMap.get(key);
      if (!externalMatch) {
        continue;
      }

      const externalStatus = getExternalStatus(externalMatch);
      const homeScore = parseScore(externalMatch.home_score);
      const awayScore = parseScore(externalMatch.away_score);
      const matchId = String(match._id);

      if (match.status === "finished") {
        continue;
      }

      if (externalStatus === "finished") {
        if (homeScore == null || awayScore == null) {
          continue;
        }

        const leaderboardBefore = await buildLeaderboard();
        const updatedMatch = await applyMatchResult(matchId, homeScore, awayScore);
        const leaderboardAfter = await buildLeaderboard();
        await sendMatchResultNotifications({
          matchId: String(updatedMatch._id),
          leaderboardBefore,
          leaderboardAfter,
        });
        finalizedCount += 1;
        continue;
      }

      if (externalStatus === "live") {
        const nextValues: Record<string, unknown> = {};
        if (match.status !== "live") {
          nextValues.status = "live";
        }
        if (homeScore != null && homeScore !== match.homeScore) {
          nextValues.homeScore = homeScore;
        }
        if (awayScore != null && awayScore !== match.awayScore) {
          nextValues.awayScore = awayScore;
        }

        if (Object.keys(nextValues).length) {
          await Match.updateOne({ _id: match._id, status: { $ne: "finished" } }, { $set: nextValues });
          updatedLiveCount += 1;
        }
        continue;
      }

      if (match.status === "live") {
        await Match.updateOne(
          { _id: match._id, status: { $ne: "finished" } },
          { $set: { status: "scheduled", homeScore: null, awayScore: null } },
        );
        updatedLiveCount += 1;
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
