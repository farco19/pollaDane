/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { anticipationStageLimits } from "@/lib/anticipation";
import { apiFetch, formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<any>("/api/me"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil del participante"
        description="Consulta los datos de tu cuenta, el valor del aporte y la configuracion vigente del torneo."
      />
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando perfil...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Datos personales</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="panel-muted rounded-2xl px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nombre</p>
                  <p className="mt-1 font-medium text-foreground">{data.user.name}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Correo</p>
                  <p className="mt-1 font-medium text-foreground">{data.user.email}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rol</p>
                  <p className="mt-1 font-medium text-foreground">{data.user.role}</p>
                </div>
              </div>
            </div>

            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Configuracion del torneo</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="panel-muted rounded-2xl px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aporte actual</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(data.settings.entryFee)}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Premio acumulado</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(data.settings.prizePool)}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Participantes</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{data.settings.participants}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Moneda</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{data.settings.currency}</p>
                </div>
                <div className="panel-muted rounded-2xl px-4 py-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cierre de pronosticos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {data.settings.predictionCutoffMode === "first_match_start" ? "Antes del primer partido" : "Antes de cada partido"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel rounded-3xl p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Reglas y puntajes</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Este es el valor actual de cada acierto definido por el administrador.
                </p>
              </div>
              <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
                Maximo teorico anticipados: {(16 * data.settings.anticipationScoring.groupQualifiedPoints) + (anticipationStageLimits.bestThirdTeamIds * data.settings.anticipationScoring.bestThirdPoints) + (anticipationStageLimits.roundOf16TeamIds * data.settings.anticipationScoring.roundOf16Points) + (anticipationStageLimits.quarterFinalTeamIds * data.settings.anticipationScoring.quarterFinalPoints) + (anticipationStageLimits.semiFinalTeamIds * data.settings.anticipationScoring.semiFinalPoints) + (anticipationStageLimits.finalTeamIds * data.settings.anticipationScoring.finalPoints) + data.settings.anticipationScoring.championPoints} pts
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="panel-muted rounded-3xl p-5">
                <h3 className="text-lg font-semibold text-foreground">Partidos</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Marcador exacto</span>
                    <span className="font-semibold text-foreground">{data.settings.matchScoring.exactScorePoints} pts base</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Ganador sin exacto</span>
                    <span className="font-semibold text-foreground">{data.settings.matchScoring.winnerPoints} pts</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Empate sin exacto</span>
                    <span className="font-semibold text-foreground">{data.settings.matchScoring.drawPoints} pts</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Partido fallado</span>
                    <span className="font-semibold text-foreground">{data.settings.matchScoring.lossPoints} pts</span>
                  </div>
                </div>
              </div>

              <div className="panel-muted rounded-3xl p-5">
                <h3 className="text-lg font-semibold text-foreground">Anticipados</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Top 2 por grupo</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.groupQualifiedPoints} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Mejores terceros</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.bestThirdPoints} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Pasa a octavos</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.roundOf16Points} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Pasa a cuartos</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.quarterFinalPoints} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Pasa a semifinal</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.semiFinalPoints} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Llega a la final</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.finalPoints} pts por equipo</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                    <span className="text-muted-foreground">Campeon</span>
                    <span className="font-semibold text-foreground">{data.settings.anticipationScoring.championPoints} pts</span>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Si aciertas el marcador exacto, tambien sumas los puntos del ganador correcto o del empate.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
