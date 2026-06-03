import { fail, ok } from "@/lib/server/api";
import { sendPredictionReminderNotifications } from "@/lib/server/push";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return fail("No autorizado", 401);
    }

    const result = await sendPredictionReminderNotifications();
    return ok(result, "Recordatorios push procesados");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible enviar recordatorios push", 500);
  }
}
