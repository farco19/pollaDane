/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["public-settings"], queryFn: () => apiFetch<any>("/api/settings/public") });
  const [draftForm, setDraftForm] = useState<any | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState("");

  const baseForm = useMemo(
    () =>
      data
        ? {
      entryFee: data.entryFee ?? 20000,
      currency: "COP",
      predictionCutoffMode: data.predictionCutoffMode ?? "first_match_start",
      matchScoring: {
        exactScorePoints: data.matchScoring?.exactScorePoints ?? 5,
        winnerPoints: data.matchScoring?.winnerPoints ?? 3,
        drawPoints: data.matchScoring?.drawPoints ?? 3,
        lossPoints: data.matchScoring?.lossPoints ?? 0,
      },
      anticipationScoring: {
        groupQualifiedPoints: data.anticipationScoring?.groupQualifiedPoints ?? 2,
        roundOf16Points: data.anticipationScoring?.roundOf16Points ?? 5,
        quarterFinalPoints: data.anticipationScoring?.quarterFinalPoints ?? 10,
        semiFinalPoints: data.anticipationScoring?.semiFinalPoints ?? 15,
        finalPoints: data.anticipationScoring?.finalPoints ?? 25,
        championPoints: data.anticipationScoring?.championPoints ?? 35,
      },
    }
        : null,
    [data],
  );
  const form = draftForm ?? baseForm;

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Configuracion actualizada");
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ deleted: { predictions: number; anticipationPredictions: number; matches: number; teams: number; inviteCodes: number } }>(
        "/api/admin/reset",
        { method: "POST" },
      ),
    onSuccess: (result) => {
      toast.success(
        `Reinicio completado. Codigos: ${result.deleted.inviteCodes}, equipos: ${result.deleted.teams}, partidos: ${result.deleted.matches}, marcadores: ${result.deleted.predictions}, anticipados: ${result.deleted.anticipationPredictions}`,
      );
      setResetConfirmation("");
      queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["participant-anticipation"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canResetTournament = resetConfirmation.trim().toUpperCase() === "REINICIAR";
  const updateForm = (updater: (current: any) => any) =>
    setDraftForm((current: any) => {
      const resolved = current ?? baseForm;
      return resolved ? updater(resolved) : current;
    });
  const updateRootNumberField = (key: "entryFee", value: string) =>
    updateForm((current) => ({ ...current, [key]: Number(value) }));
  const updateNestedNumberField = (section: "matchScoring" | "anticipationScoring", key: string, value: string) =>
    updateForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: Number(value),
      },
    }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Torneo" title="Configuracion general" description="Define el aporte, el cierre de pronosticos y la matriz de puntos para marcadores y anticipados." />
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando configuracion...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      {form ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="panel rounded-3xl p-6">
              <label className="field-label">Aporte unico por participante</label>
              <input type="number" min={1000} value={String(form.entryFee)} onChange={(e) => updateRootNumberField("entryFee", e.target.value)} className="field-input" />

              <label className="field-label mt-5">Cierre de pronosticos por marcador</label>
              <select
                value={form.predictionCutoffMode}
                  onChange={(e) => updateForm((current) => ({ ...current, predictionCutoffMode: e.target.value }))}
                className="field-select"
              >
                <option value="first_match_start">Antes del primer partido</option>
                <option value="match_start">Antes de cada partido</option>
              </select>

              <button type="button" onClick={() => mutation.mutate()} className="btn-primary mt-5" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Guardar configuracion"}
              </button>
            </div>

            <div className="panel rounded-3xl p-6 text-sm text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">Resumen actual</h2>
              <p className="mt-4">Aporte: {data ? formatCurrency(data.entryFee) : "-"}</p>
              <p className="mt-2">Participantes: {data?.participants ?? 0}</p>
              <p className="mt-2">Premio acumulado: {data ? formatCurrency(data.prizePool) : "-"}</p>
              <p className="mt-2">Primer partido: {data?.firstMatchDate ? new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.firstMatchDate)) : "Sin definir"}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Puntos por marcador</h2>
              <p className="mt-2 text-sm text-muted-foreground">Estos valores se aplican a los partidos y se recalculan en el ranking si cambian.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">Marcador exacto</label>
                  <input type="number" min={0} value={String(form.matchScoring.exactScorePoints)} onChange={(e) => updateNestedNumberField("matchScoring", "exactScorePoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Ganador sin exacto</label>
                  <input type="number" min={0} value={String(form.matchScoring.winnerPoints)} onChange={(e) => updateNestedNumberField("matchScoring", "winnerPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Empate sin exacto</label>
                  <input type="number" min={0} value={String(form.matchScoring.drawPoints)} onChange={(e) => updateNestedNumberField("matchScoring", "drawPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Partido fallado</label>
                  <input type="number" min={0} value={String(form.matchScoring.lossPoints)} onChange={(e) => updateNestedNumberField("matchScoring", "lossPoints", e.target.value)} className="field-input" />
                </div>
              </div>
            </div>

            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Puntos por anticipados</h2>
              <p className="mt-2 text-sm text-muted-foreground">Los pronosticos anticipados se editan hasta el inicio del primer partido y suman por cada acierto.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">Top 2 de grupo</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.groupQualifiedPoints)} onChange={(e) => updateNestedNumberField("anticipationScoring", "groupQualifiedPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Pasa a octavos</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.roundOf16Points)} onChange={(e) => updateNestedNumberField("anticipationScoring", "roundOf16Points", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Pasa a cuartos</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.quarterFinalPoints)} onChange={(e) => updateNestedNumberField("anticipationScoring", "quarterFinalPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Pasa a semifinal</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.semiFinalPoints)} onChange={(e) => updateNestedNumberField("anticipationScoring", "semiFinalPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Llega a la final</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.finalPoints)} onChange={(e) => updateNestedNumberField("anticipationScoring", "finalPoints", e.target.value)} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Campeon</label>
                  <input type="number" min={0} value={String(form.anticipationScoring.championPoints)} onChange={(e) => updateNestedNumberField("anticipationScoring", "championPoints", e.target.value)} className="field-input" />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      <div className="error-panel rounded-3xl p-6 text-sm">
        <h2 className="text-xl font-semibold text-foreground">Zona de peligro</h2>
        <p className="mt-4">
          Este reinicio elimina todos los codigos, equipos, partidos, pronosticos por marcador y pronosticos anticipados. Los usuarios registrados y la configuracion general se conservan.
        </p>
        <label className="mt-4 block text-sm font-medium">Escribe REINICIAR para confirmar</label>
        <input
          type="text"
          value={resetConfirmation}
          onChange={(e) => setResetConfirmation(e.target.value)}
          className="field-input mt-2"
        />
        <button
          type="button"
          onClick={() => resetMutation.mutate()}
          disabled={!canResetTournament || resetMutation.isPending}
          className="btn-danger mt-4"
        >
          {resetMutation.isPending ? "Reiniciando..." : "Reiniciar base del torneo"}
        </button>
      </div>
    </div>
  );
}
