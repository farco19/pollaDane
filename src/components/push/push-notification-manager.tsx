"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const isIos = useMemo(
    () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      const existingSubscription = await registration.pushManager.getSubscription();
      if (!cancelled) {
        setSubscription(existingSubscription);
      }
    }

    setup().catch(() => {
      setIsSupported(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    try {
      setIsBusy(true);

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error("Falta configurar la clave publica VAPID");
      }

      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        throw new Error("Debes aceptar las notificaciones para activarlas");
      }

      const registration = await navigator.serviceWorker.ready;
      const nextSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      await apiFetch("/api/push/subscription", {
        method: "POST",
        body: JSON.stringify(JSON.parse(JSON.stringify(nextSubscription))),
      });

      setSubscription(nextSubscription);
      toast.success("Notificaciones push activadas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible activar notificaciones");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUnsubscribe() {
    if (!subscription) {
      return;
    }

    try {
      setIsBusy(true);

      await apiFetch("/api/push/subscription", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      toast.success("Notificaciones push desactivadas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible desactivar notificaciones");
    } finally {
      setIsBusy(false);
    }
  }

  if (!isSupported) {
    return (
      <div className="panel rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <BellOff className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notificaciones push no disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Este navegador no soporta Web Push. Prueba con Chrome en Android o Safari en iPhone.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Smartphone className="size-4" />
            Web Push en tu celular
          </div>
          <h2 className="mt-2 text-lg font-semibold text-foreground">Recibe alertas cuando cambien resultados y posiciones</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Te avisaremos cuando se cargue un marcador oficial, cuántos puntos sumaste, cómo quedaste en la tabla y cuando se acerque el cierre de pronósticos.
          </p>
          {isIos ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              En iPhone abre esta web con Safari, agrégala a pantalla de inicio y luego acepta las notificaciones.
            </p>
          ) : null}
          {permission === "denied" ? (
            <p className="mt-2 text-xs leading-5 text-destructive">
              Bloqueaste las notificaciones. Debes habilitarlas desde la configuración del navegador para volver a activarlas.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
            {subscription ? "Activas en este dispositivo" : "Aun no activadas"}
          </div>
          {subscription ? (
            <button type="button" onClick={handleUnsubscribe} disabled={isBusy} className="btn-secondary">
              <BellOff className="mr-2 inline size-4" />
              {isBusy ? "Desactivando..." : "Desactivar push"}
            </button>
          ) : (
            <button type="button" onClick={handleSubscribe} disabled={isBusy} className="btn-primary">
              <Bell className="mr-2 inline size-4" />
              {isBusy ? "Activando..." : "Activar notificaciones"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
