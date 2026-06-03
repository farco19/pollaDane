import { z } from "zod";
import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { removePushSubscription, savePushSubscription, serializePushSubscription } from "@/lib/server/push";
import { requireSessionUser } from "@/lib/server/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();
    const json = await request.json();
    const parsed = subscriptionSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Suscripcion push invalida", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    await savePushSubscription(user.id, serializePushSubscription(parsed.data), request.headers.get("user-agent"));
    return ok({ subscribed: true }, "Notificaciones activadas");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible activar notificaciones", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await bootstrapDataLayer();
    const user = await requireSessionUser();
    const json = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Suscripcion push invalida", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    await removePushSubscription(user.id, parsed.data.endpoint);
    return ok({ subscribed: false }, "Notificaciones desactivadas");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible desactivar notificaciones", 500);
  }
}
