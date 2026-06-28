"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

function formatGoalDifference(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export default function OfficialStandingsPage() {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-anticipation"],
    queryFn: () => apiFetch<any>("/api/participant/anticipation"),
    refetchInterval: 30000,
  });

  const standingsGroups = useMemo(
    () => (data?.standingsOverview?.groups ?? []).map((group: any) => group.group),
    [data?.standingsOverview?.groups],
  );
  const visibleStandingsGroups = useMemo(
    () =>
      (data?.standingsOverview?.groups ?? []).filter(
        (group: any) => selectedGroup === "all" || group.group === selectedGroup,
      ),
    [data?.standingsOverview?.groups, selectedGroup],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clasificacion"
        title="Tabla oficial del torneo"
        description="Consulta la tabla por grupos, los mejores terceros oficiales y los clasificados que ya quedaron definidos."
      />

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando clasificacion oficial...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}

      {data ? (
        <>
          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Tabla oficial por grupos</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Esta tabla se arma con los resultados cargados. Los mejores terceros solo aparecen como oficiales cuando el admin los confirma manualmente.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="xl:col-span-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup("all")}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedGroup === "all"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    Todos los grupos
                  </button>
                  {standingsGroups.map((group: string) => (
                    <button
                      key={`filter-${group}`}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selectedGroup === group
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      Grupo {group}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">Top 2 oficial</span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600">Mejor tercero oficial</span>
                  <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">Pendiente por definirse</span>
                </div>
              </div>

              {visibleStandingsGroups.map((group: any) => (
                <div key={`standings-${group.group}`} className="panel rounded-3xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Grupo {group.group}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.completed ? "Clasificacion oficial cerrada" : "Tabla parcial segun resultados cargados"}
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                      {group.completed ? "Oficial" : "En juego"}
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
                          <th className="pb-3 pr-3">GF</th>
                          <th className="pb-3">GC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((team: any) => (
                          <tr
                            key={`table-${group.group}-${team._id}`}
                            className={`border-t border-border/60 ${
                              team.isOfficialTopTwo
                                ? "bg-primary/5"
                                : team.isOfficialBestThird
                                  ? "bg-emerald-500/5"
                                  : group.completed
                                    ? ""
                                    : "bg-muted/30"
                            }`}
                          >
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                {team.flagUrl ? (
                                  <Image src={team.flagUrl} alt={team.name} width={24} height={18} className="h-[18px] w-6 object-contain" />
                                ) : null}
                                <div>
                                  <p className="font-medium text-foreground">{team.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {team.isOfficialTopTwo ? (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Top 2 oficial</span>
                                    ) : null}
                                    {team.isOfficialBestThird ? (
                                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">Mejor tercero</span>
                                    ) : null}
                                    {!team.isOfficialTopTwo && !team.isOfficialBestThird && !group.completed ? (
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Pendiente</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-muted-foreground">{team.played}</td>
                            <td className="py-3 pr-3 font-semibold text-foreground">{team.points}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{formatGoalDifference(team.goalDifference)}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{team.goalsFor}</td>
                            <td className="py-3 text-muted-foreground">{team.goalsAgainst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="panel rounded-3xl p-5">
              <h3 className="text-lg font-semibold text-foreground">Clasificados oficiales</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estos bloques solo muestran equipos cuando ya quedaron definidos oficialmente por resultados o por presencia confirmada en la fase siguiente.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  ["Mejores terceros", data.standingsOverview?.official?.bestThirdTeams ?? []],
                  ["Clasificados a 16vos", data.standingsOverview?.official?.roundOf32Teams ?? []],
                  ["Octavos", data.standingsOverview?.official?.roundOf16Teams ?? []],
                  ["Cuartos", data.standingsOverview?.official?.quarterFinalTeams ?? []],
                  ["Semifinal", data.standingsOverview?.official?.semiFinalTeams ?? []],
                  ["Final", data.standingsOverview?.official?.finalTeams ?? []],
                ].map(([label, teams]) => (
                  <div key={String(label)} className="panel-muted rounded-2xl p-4">
                    <p className="font-medium text-foreground">{label}</p>
                    {(teams as any[]).length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(teams as any[]).map((team: any) => (
                          <span key={`${label}-${team._id}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                            {team.flagUrl ? (
                              <Image src={team.flagUrl} alt={team.name} width={18} height={14} className="h-[14px] w-[18px] object-contain" />
                            ) : null}
                            {team.shortName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-muted-foreground">Aun no hay clasificados oficiales en esta fase.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel rounded-3xl p-5">
              <h3 className="text-lg font-semibold text-foreground">Campeon oficial</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Se muestra cuando la final ya tiene resultado oficial cargado.
              </p>
              {data.standingsOverview?.official?.championTeam ? (
                <div className="panel-muted mt-4 flex items-center gap-3 rounded-2xl p-4">
                  {data.standingsOverview.official.championTeam.flagUrl ? (
                    <Image
                      src={data.standingsOverview.official.championTeam.flagUrl}
                      alt={data.standingsOverview.official.championTeam.name}
                      width={28}
                      height={21}
                      className="h-[21px] w-7 object-contain"
                    />
                  ) : null}
                  <div>
                    <p className="font-medium text-foreground">{data.standingsOverview.official.championTeam.name}</p>
                    <p className="text-sm text-muted-foreground">{data.standingsOverview.official.championTeam.shortName}</p>
                  </div>
                </div>
              ) : (
                <div className="panel-muted mt-4 rounded-2xl p-4 text-sm text-muted-foreground">
                  Aun no hay campeon oficial definido.
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
