/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

const stageLimits = {
  roundOf16TeamIds: 16,
  quarterFinalTeamIds: 8,
  semiFinalTeamIds: 4,
  finalTeamIds: 2,
} as const;

type AnticipationForm = {
  groupRankings: Array<{ group: string; firstTeamId: string | null; secondTeamId: string | null }>;
  stageSelections: {
    roundOf16TeamIds: string[];
    quarterFinalTeamIds: string[];
    semiFinalTeamIds: string[];
    finalTeamIds: string[];
    championTeamId: string | null;
  };
};

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Sin partidos programados";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function TeamChip({
  team,
  active,
  onClick,
}: {
  team: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {team.flagUrl ? (
        <Image src={team.flagUrl} alt={team.name} width={28} height={21} className="h-[21px] w-7 object-contain" />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{team.name}</p>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{team.shortName}</p>
      </div>
    </button>
  );
}

export default function AnticipationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-anticipation"],
    queryFn: () => apiFetch<any>("/api/participant/anticipation"),
  });
  const [draftForm, setDraftForm] = useState<AnticipationForm | null>(null);
  const baseForm = useMemo(
    () =>
      data
        ? {
      groupRankings:
        data.prediction?.groupRankings ??
        (data.groups ?? []).map((group: any) => ({
          group: group.group,
          firstTeamId: null,
          secondTeamId: null,
        })),
      stageSelections:
        data.prediction?.stageSelections ??
        {
          roundOf16TeamIds: [],
          quarterFinalTeamIds: [],
          semiFinalTeamIds: [],
          finalTeamIds: [],
          championTeamId: null,
        },
    }
        : null,
    [data],
  );
  const form = draftForm ?? baseForm;

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/participant/anticipation", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Pronosticos anticipados guardados");
      queryClient.invalidateQueries({ queryKey: ["participant-anticipation"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateForm = (updater: (current: AnticipationForm) => AnticipationForm) =>
    setDraftForm((current) => {
      const resolved = current ?? baseForm;
      return resolved ? updater(resolved) : current;
    });

  function updateGroupSelection(group: string, slot: "firstTeamId" | "secondTeamId", teamId: string) {
    updateForm((current) => ({
      ...current,
      groupRankings: current.groupRankings.map((item) => {
        if (item.group !== group) {
          return item;
        }

        if (slot === "firstTeamId") {
          return {
            ...item,
            firstTeamId: item.firstTeamId === teamId ? null : teamId,
            secondTeamId: item.secondTeamId === teamId ? null : item.secondTeamId,
          };
        }

        return {
          ...item,
          secondTeamId: item.secondTeamId === teamId ? null : teamId,
          firstTeamId: item.firstTeamId === teamId ? null : item.firstTeamId,
        };
      }),
    }));
  }

  function toggleStageSelection(stageKey: keyof typeof stageLimits, teamId: string) {
    updateForm((current) => {
      const values = current.stageSelections[stageKey];
      const exists = values.includes(teamId);

      if (!exists && values.length >= stageLimits[stageKey]) {
        toast.error(`Solo puedes seleccionar ${stageLimits[stageKey]} equipos en esta fase`);
        return current;
      }

      return {
        ...current,
        stageSelections: {
          ...current.stageSelections,
          [stageKey]: exists ? values.filter((value) => value !== teamId) : [...values, teamId],
        },
      };
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Anticipados"
        title="Pronosticos anticipados"
        description="Define antes del primer partido tus clasificados por grupo, equipos que avanzan por fase y el campeon del torneo."
      />

      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cierre general</p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatDateLabel(data?.firstMatchDate ?? null)}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estado</p>
            <p className="mt-2 text-sm font-medium text-foreground">{data?.locked ? "Cerrado" : "Abierto para edicion"}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Regla</p>
            <p className="mt-2 text-sm font-medium text-foreground">Todos estos pronosticos se bloquean al iniciar el primer partido.</p>
          </div>
        </div>

        {data?.settings ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="panel-muted rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-foreground">Resumen de puntos</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Cada acierto suma por equipo. Puedes acertar uno, varios o todos dentro de cada bloque.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Top 2 por grupo</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.groupQualifiedPoints} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Pasa a octavos</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.roundOf16Points} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Pasa a cuartos</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.quarterFinalPoints} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Pasa a semifinal</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.semiFinalPoints} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Llega a la final</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.finalPoints} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Campeon</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.championPoints} pts</span>
                </div>
              </div>
            </div>

            <div className="panel-muted rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-foreground">Potencial maximo</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Si aciertas todo, este es el puntaje teorico que puedes conseguir solo con anticipados.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top 2 grupos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{16 * data.settings.anticipationScoring.groupQualifiedPoints} pts</p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Octavos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{16 * data.settings.anticipationScoring.roundOf16Points} pts</p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cuartos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{8 * data.settings.anticipationScoring.quarterFinalPoints} pts</p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Semifinal</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{4 * data.settings.anticipationScoring.semiFinalPoints} pts</p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Final</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{2 * data.settings.anticipationScoring.finalPoints} pts</p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Total maximo</p>
                  <p className="mt-2 text-lg font-semibold text-primary">
                    {(16 * data.settings.anticipationScoring.groupQualifiedPoints) +
                      (16 * data.settings.anticipationScoring.roundOf16Points) +
                      (8 * data.settings.anticipationScoring.quarterFinalPoints) +
                      (4 * data.settings.anticipationScoring.semiFinalPoints) +
                      (2 * data.settings.anticipationScoring.finalPoints) +
                      data.settings.anticipationScoring.championPoints} pts
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando pronosticos anticipados...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}

      {data && form ? (
        <>
          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Clasificados por grupo</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Elige primero y segundo de cada grupo. Se otorgan puntos por cada equipo correcto dentro del top 2, sin importar el orden.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {data.groups.map((group: any) => {
                const currentGroup = form.groupRankings.find((item: AnticipationForm["groupRankings"][number]) => item.group === group.group) ?? {
                  group: group.group,
                  firstTeamId: null,
                  secondTeamId: null,
                };

                return (
                  <div key={group.group} className="panel rounded-3xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Grupo {group.group}</h3>
                        <p className="text-sm text-muted-foreground">Selecciona dos clasificados</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Primer clasificado</p>
                        <div className="grid gap-2">
                          {group.teams.map((team: any) => (
                            <TeamChip
                              key={`${group.group}-first-${team._id}`}
                              team={team}
                              active={currentGroup.firstTeamId === team._id}
                              onClick={() => updateGroupSelection(group.group, "firstTeamId", team._id)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Segundo clasificado</p>
                        <div className="grid gap-2">
                          {group.teams.map((team: any) => (
                            <TeamChip
                              key={`${group.group}-second-${team._id}`}
                              team={team}
                              active={currentGroup.secondTeamId === team._id}
                              onClick={() => updateGroupSelection(group.group, "secondTeamId", team._id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Clasificados por fase</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Selecciona los equipos que crees que alcanzaran cada ronda. Los puntos se otorgan por cada equipo acertado.
              </p>
            </div>

            {[
              ["roundOf16TeamIds", "Octavos de final", 16],
              ["quarterFinalTeamIds", "Cuartos de final", 8],
              ["semiFinalTeamIds", "Semifinal", 4],
              ["finalTeamIds", "Final", 2],
            ].map(([stageKey, label, limit]) => (
              <div key={stageKey} className="panel rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">Seleccionados: {form.stageSelections[stageKey as keyof typeof stageLimits].length} / {limit}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {data.teams.map((team: any) => (
                    <TeamChip
                      key={`${stageKey}-${team._id}`}
                      team={team}
                      active={form.stageSelections[stageKey as keyof typeof stageLimits].includes(team._id)}
                      onClick={() => toggleStageSelection(stageKey as keyof typeof stageLimits, team._id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Campeon</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Selecciona el equipo que se coronara campeon del torneo.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {data.teams.map((team: any) => (
                  <TeamChip
                    key={`champion-${team._id}`}
                    team={team}
                    active={form.stageSelections.championTeamId === team._id}
                    onClick={() =>
                      updateForm((current) => ({
                        ...current,
                        stageSelections: {
                          ...current.stageSelections,
                          championTeamId: current.stageSelections.championTeamId === team._id ? null : team._id,
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || data.locked} className="btn-primary">
              {mutation.isPending ? "Guardando..." : "Guardar pronosticos anticipados"}
            </button>
            <button
              type="button"
              onClick={() =>
                setDraftForm({
                  groupRankings: data.groups.map((group: any) => ({
                    group: group.group,
                    firstTeamId: null,
                    secondTeamId: null,
                  })),
                  stageSelections: {
                    roundOf16TeamIds: [],
                    quarterFinalTeamIds: [],
                    semiFinalTeamIds: [],
                    finalTeamIds: [],
                    championTeamId: null,
                  },
                })
              }
              disabled={mutation.isPending || data.locked}
              className="btn-secondary"
            >
              Limpiar seleccion
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
