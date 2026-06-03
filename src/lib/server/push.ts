/* eslint-disable @typescript-eslint/no-explicit-any */
import webpush from "web-push";
import { connectToDatabase } from "@/lib/db";
import { buildLeaderboard } from "@/lib/server/leaderboard";
import { getFirstMatchDate, getPredictionCloseTime } from "@/lib/server/tournament";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { PushNotificationLog } from "@/models/PushNotificationLog";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { TournamentSettings } from "@/models/TournamentSettings";
import { User } from "@/models/User";

export type SerializedPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let vapidInitialized = false;

function ensureWebPushReady() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@polladane.com";

  if (!publicKey || !privateKey) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY");
  }

  if (!vapidInitialized) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidInitialized = true;
  }

  return { publicKey };
}

export function getPublicVapidKey() {
  return ensureWebPushReady().publicKey;
}

export function serializePushSubscription(input: any): SerializedPushSubscription {
  return {
    endpoint: String(input.endpoint ?? ""),
    expirationTime: typeof input.expirationTime === "number" ? input.expirationTime : null,
    keys: {
      p256dh: String(input.keys?.p256dh ?? ""),
      auth: String(input.keys?.auth ?? ""),
    },
  };
}

export async function savePushSubscription(userId: string, subscription: SerializedPushSubscription, userAgent?: string | null) {
  await connectToDatabase();

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: subscription.keys,
      userAgent: userAgent ?? null,
    },
    { upsert: true, new: true },
  );
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await connectToDatabase();
  await PushSubscriptionModel.deleteOne({ userId, endpoint });
}

async function reserveNotification(userId: string, type: string, eventKey: string) {
  try {
    await PushNotificationLog.create({ userId, type, eventKey });
    return true;
  } catch (error: any) {
    if (error?.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function sendToUserSubscriptions(userId: string, payload: PushPayload) {
  ensureWebPushReady();

  const subscriptions = await PushSubscriptionModel.find({ userId }).lean();
  if (!subscriptions.length) {
    return false;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? undefined,
  });

  let delivered = false;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
          },
          body,
        );
        delivered = true;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ _id: subscription._id });
          return;
        }

        throw error;
      }
    }),
  );

  return delivered;
}

function buildResultMessage(params: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  points: number;
  isExact: boolean;
  predictedDraw: boolean;
  realDraw: boolean;
  rankBefore: number | null;
  rankAfter: number | null;
  totalPoints: number;
}) {
  const baseTitle = `${params.homeTeam} ${params.homeScore} - ${params.awayScore} ${params.awayTeam}`;

  let performanceText = "No sumaste puntos en este partido.";
  if (params.isExact) {
    performanceText = `Acertaste el marcador exacto y sumaste ${params.points} puntos.`;
  } else if (params.points > 0 && params.predictedDraw && params.realDraw) {
    performanceText = `Acertaste el empate y sumaste ${params.points} puntos.`;
  } else if (params.points > 0) {
    performanceText = `Acertaste el ganador y sumaste ${params.points} puntos.`;
  }

  let rankText = `Ahora vas en el puesto ${params.rankAfter ?? "-"}.`;
  if (params.rankAfter === 1 && params.rankBefore !== 1) {
    rankText = "Ahora eres lider de la tabla.";
  } else if (params.rankBefore && params.rankAfter && params.rankAfter < params.rankBefore) {
    rankText = `Subiste del puesto ${params.rankBefore} al ${params.rankAfter}.`;
  } else if (params.rankBefore && params.rankAfter && params.rankAfter > params.rankBefore) {
    rankText = `Bajaste del puesto ${params.rankBefore} al ${params.rankAfter}.`;
  } else if (params.rankAfter) {
    rankText = `Sigues en el puesto ${params.rankAfter}.`;
  }

  return {
    title: `Resultado oficial: ${baseTitle}`,
    body: `${performanceText} ${rankText} Total: ${params.totalPoints} puntos.`,
  };
}

export async function sendMatchResultNotifications(params: {
  matchId: string;
  leaderboardBefore: Awaited<ReturnType<typeof buildLeaderboard>>;
  leaderboardAfter: Awaited<ReturnType<typeof buildLeaderboard>>;
}) {
  await connectToDatabase();

  const match = await Match.findById(params.matchId).populate("homeTeamId awayTeamId").lean();
  if (!match || match.homeScore == null || match.awayScore == null) {
    return;
  }

  const resultLoadedAt = match.resultLoadedAt ? new Date(match.resultLoadedAt).toISOString() : `${match.homeScore}-${match.awayScore}`;
  const eventBase = `result:${String(match._id)}:${resultLoadedAt}`;
  const predictions = await Prediction.find({ matchId: match._id }).lean();
  const predictionMap = new Map(predictions.map((prediction) => [String(prediction.userId), prediction]));
  const beforeRankMap = new Map(params.leaderboardBefore.leaderboard.map((entry) => [entry.userId, entry.rank]));
  const afterEntryMap = new Map(params.leaderboardAfter.leaderboard.map((entry) => [entry.userId, entry]));
  const users = await User.find({ role: "participant", isActive: true }).select({ _id: 1 }).lean();
  const homeTeam = match.homeTeamId as any;
  const awayTeam = match.awayTeamId as any;
  const homeScore = Number(match.homeScore);
  const awayScore = Number(match.awayScore);

  await Promise.all(
    users.map(async (user) => {
      const userId = String(user._id);
      const reserved = await reserveNotification(userId, "match_result", eventBase);
      if (!reserved) {
        return;
      }

      const prediction = predictionMap.get(userId);
      const afterEntry = afterEntryMap.get(userId);
      const points = prediction?.pointsAwarded ?? 0;
      const predictedDraw = prediction ? prediction.predictedHomeScore === prediction.predictedAwayScore : false;
      const realDraw = match.homeScore === match.awayScore;
      const isExact = prediction ? prediction.predictedHomeScore === match.homeScore && prediction.predictedAwayScore === match.awayScore : false;
      const payload = buildResultMessage({
        homeTeam: homeTeam?.shortName ?? homeTeam?.name ?? "Local",
        awayTeam: awayTeam?.shortName ?? awayTeam?.name ?? "Visitante",
        homeScore,
        awayScore,
        points,
        isExact,
        predictedDraw,
        realDraw,
        rankBefore: beforeRankMap.get(userId) ?? null,
        rankAfter: afterEntry?.rank ?? null,
        totalPoints: afterEntry?.totalPoints ?? 0,
      });

      await sendToUserSubscriptions(userId, {
        title: payload.title,
        body: payload.body,
        url: "/dashboard",
        tag: `match-result-${String(match._id)}`,
      });
    }),
  );
}

export async function sendPredictionReminderNotifications() {
  await connectToDatabase();

  const [settings, matches] = await Promise.all([
    TournamentSettings.findOne().lean(),
    Match.find({ status: "scheduled" }).sort({ matchDate: 1 }).populate("homeTeamId awayTeamId").lean(),
  ]);

  if (!matches.length) {
    return { sent: 0 };
  }

  const firstMatchDate = getFirstMatchDate(matches);
  const users = await User.find({ role: "participant", isActive: true }).select({ _id: 1 }).lean();
  let sent = 0;

  const targets =
    (settings?.predictionCutoffMode ?? "first_match_start") === "first_match_start"
      ? matches.slice(0, 1)
      : matches;

  for (const match of targets) {
    const closeAt = getPredictionCloseTime({
      mode: settings?.predictionCutoffMode ?? "first_match_start",
      matchDate: match.matchDate,
      firstMatchDate,
    });
    const now = Date.now();
    const remainingMs = closeAt.getTime() - now;

    if (remainingMs <= 0 || remainingMs > 24 * 60 * 60 * 1000) {
      continue;
    }

    const eventBase = `reminder:${String(match._id)}:${new Date().toISOString().slice(0, 10)}`;
    const hoursLeft = Math.max(1, Math.round(remainingMs / (60 * 60 * 1000)));
    const title =
      (settings?.predictionCutoffMode ?? "first_match_start") === "first_match_start"
        ? "Tus pronosticos cierran hoy"
        : `Cierre pronto: ${(match.homeTeamId as any)?.shortName ?? "LOC"} vs ${(match.awayTeamId as any)?.shortName ?? "VIS"}`;
    const body =
      (settings?.predictionCutoffMode ?? "first_match_start") === "first_match_start"
        ? `Hoy se bloquean todos los pronosticos al iniciar el primer partido. Quedan cerca de ${hoursLeft} horas para revisar tu dashboard.`
        : `Tus pronosticos para ${(match.homeTeamId as any)?.name ?? "Local"} vs ${(match.awayTeamId as any)?.name ?? "Visitante"} cierran hoy. Revisa el dashboard antes del partido.`;

    for (const user of users) {
      const userId = String(user._id);
      const reserved = await reserveNotification(userId, "prediction_reminder", eventBase);
      if (!reserved) {
        continue;
      }

      const delivered = await sendToUserSubscriptions(userId, {
        title,
        body,
        url: "/dashboard",
        tag: `prediction-reminder-${String(match._id)}`,
      });

      if (delivered) {
        sent += 1;
      }
    }

    if ((settings?.predictionCutoffMode ?? "first_match_start") === "first_match_start") {
      break;
    }
  }

  return { sent };
}
