"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

interface RankedTeam {
  _id: string;
  name: string;
  shortName: string;
  group?: string | null;
  flagUrl?: string | null;
}

interface ThirdPlaceRankingEntry {
  group: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
  team: RankedTeam;
}

interface GroupTableRow extends RankedTeam {
  played: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  isOfficialTopTwo: boolean;
  isCurrentThird: boolean;
  isOfficialBestThird: boolean;
}

interface GroupTable {
  group: string;
  completed: boolean;
  rows: GroupTableRow[];
}

interface OfficialStandingsResponse {
  officialBestThirdTeamIds: string[];
  recommendedBestThirdTeamIds: string[];
  canOfficialize: boolean;
  groups: GroupTable[];
  thirdPlaceRanking: ThirdPlaceRankingEntry[];
}

function formatGoalDifference(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export default function OfficialStandingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-official-standings"],
    queryFn: () => apiFetch<OfficialStandingsResponse>("/api/admin/official-standings"),
  });
  const [draftSelection, setDraftSelection] = useState<string[] | null>(null);

  const selectedIds = useMemo(() => draftSelection ?? data?.officialBestThirdTeamIds ?? [], [draftSelection, data?.officialBestThirdTeamIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const mutation = useMutation({
    mutationFn: (officialBestThirdTeamIds: string[]) =>
      apiFetch("/api/admin/official-standings", {
        method: "PATCH",
        body: JSON.stringify({ officialBestThirdTeamIds }),
      }),
    onSuccess: () => {
      toast.success("Clasificacion oficial actualizada");
      setDraftSelection(null);
      queryClient.invalidateQueries({ queryKey: ["admin-official-standings"] });
      queryClient.invalidateQueries({ queryKey: ["participant-anticipation"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleTeam(teamId: string) {
    setDraftSelection((current) => {
      const resolved = current ?? data?.officialBestThirdTeamIds ?? [];
      const exists = resolved.includes(teamId);

      if (!exists && resolved.length >= 8) {
        toast.error("Solo puedes oficializar 8 mejores terceros");
        return resolved;
      }

      return exists ? resolved.filter((item) => item !== teamId) : [...resolved, teamId];
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clasificacion"
        title="Mejores terceros oficiales"
        description="Define manualmente los 8 mejores terceros oficiales para contemplar criterios externos como Fair Play cuando haga falta."
      />

      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Seleccionados</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{selectedIds.length} / 8</p>
          </div>
          <div className="panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estado</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {data?.canOfficialize ? "Listo para oficializar" : "Faltan grupos por cerrar"}
            </p>
          </div>
          <div className="panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Regla</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Hasta que no guardes 8 terceros oficiales, en anticipados esta categoria sigue pendiente y no suma puntos.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDraftSelection(data?.recommendedBestThirdTeamIds ?? [])}
            disabled={!data?.canOfficialize}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cargar sugeridos por puntos
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate(selectedIds)}
            disabled={mutation.isPending || selectedIds.length !== 8}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando..." : "Guardar terceros oficiales"}
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate([])}
            disabled={mutation.isPending}
            className="btn-secondary"
          >
            Limpiar oficializacion
          </button>
        </div>
      </div>

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando clasificacion oficial...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}

      {data ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-foreground">Ranking provisional de terceros</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Esta sugerencia usa solo puntos, diferencia de gol y goles a favor. Si FIFA define por Fair Play, tu seleccion manual manda.
              </p>
              <div className="mt-4 space-y-3">
                {(data.thirdPlaceRanking ?? []).map((entry, index: number) => {
                  const isSelected = selectedSet.has(entry.team._id);
                  const isSuggested = (data.recommendedBestThirdTeamIds ?? []).includes(entry.team._id);

                  return (
                    <button
                      key={`third-${entry.team._id}`}
                      type="button"
                      onClick={() => toggleTeam(entry.team._id)}
                      className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected ? "border-primary/20 bg-primary/10" : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                          {index + 1}
                        </div>
                        {entry.team.flagUrl ? (
                          <Image src={entry.team.flagUrl} alt={entry.team.name} width={24} height={18} className="h-[18px] w-6 object-contain" />
                        ) : null}
                        <div>
                          <p className="font-medium text-foreground">{entry.team.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Grupo {entry.group}</span>
                            <span>{entry.points} pts</span>
                            <span>DG {formatGoalDifference(entry.goalDifference)}</span>
                            <span>GF {entry.goalsFor}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {isSuggested ? (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600">Sugerido</span>
                        ) : null}
                        {isSelected ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">Oficial</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-foreground">Selección oficial actual</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estos son los terceros que ya cuentan para la tabla oficial y para el puntaje de anticipados.
              </p>
              <div className="mt-4 space-y-3">
                {selectedIds.length ? (
                  (data.thirdPlaceRanking ?? [])
                    .filter((entry) => selectedSet.has(entry.team._id))
                    .map((entry) => (
                      <div key={`official-${entry.team._id}`} className="panel-muted flex items-center gap-3 rounded-2xl p-4">
                        {entry.team.flagUrl ? (
                          <Image src={entry.team.flagUrl} alt={entry.team.name} width={24} height={18} className="h-[18px] w-6 object-contain" />
                        ) : null}
                        <div>
                          <p className="font-medium text-foreground">{entry.team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Grupo {entry.group} | {entry.points} pts | DG {formatGoalDifference(entry.goalDifference)}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="panel-muted rounded-2xl p-4 text-sm text-muted-foreground">
                    Aun no hay mejores terceros oficiales definidos.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Tabla por grupos</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Aqui puedes contrastar el top 2 oficial de cada grupo con el tercero actual y con los terceros que ya marcaste como oficiales.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {(data.groups ?? []).map((group) => (
                <div key={`group-${group.group}`} className="panel rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Grupo {group.group}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.completed ? "Grupo cerrado" : "Pendiente por cerrar"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="pb-3 pr-3">Equipo</th>
                          <th className="pb-3 pr-3">PJ</th>
                          <th className="pb-3 pr-3">PTS</th>
                          <th className="pb-3 pr-3">DG</th>
                          <th className="pb-3">GF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((team) => (
                          <tr
                            key={`row-${group.group}-${team._id}`}
                            className={`border-t border-border/60 ${
                              team.isOfficialTopTwo
                                ? "bg-primary/5"
                                : team.isOfficialBestThird
                                  ? "bg-emerald-500/5"
                                  : team.isCurrentThird
                                    ? "bg-amber-500/5"
                                    : ""
                            }`}
                          >
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                {team.flagUrl ? (
                                  <Image src={team.flagUrl} alt={team.name} width={24} height={18} className="h-[18px] w-6 object-contain" />
                                ) : null}
                                <div>
                                  <p className="font-medium text-foreground">{team.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                                    {team.isOfficialTopTwo ? (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Top 2</span>
                                    ) : null}
                                    {team.isCurrentThird ? (
                                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">Tercero actual</span>
                                    ) : null}
                                    {team.isOfficialBestThird ? (
                                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600">Tercero oficial</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-muted-foreground">{team.played}</td>
                            <td className="py-3 pr-3 font-semibold text-foreground">{team.points}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{formatGoalDifference(team.goalDifference)}</td>
                            <td className="py-3 text-muted-foreground">{team.goalsFor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
