/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { DetailModal } from "@/components/ui/detail-modal";
import {
  anticipationStageLimits,
  getAnticipationCandidatePools,
  sanitizeAnticipationForm,
  type AnticipationFormShape,
} from "@/lib/anticipation";
import { formatLongMatchDate } from "@/lib/match-datetime";
import { apiFetch } from "@/lib/utils";

type AnticipationForm = AnticipationFormShape;

function createEmptyForm(groups: Array<{ group: string }>): AnticipationForm {
  return {
    groupRankings: groups.map((group) => ({
      group: group.group,
      firstTeamId: null,
      secondTeamId: null,
    })),
    stageSelections: {
      bestThirdTeamIds: [],
      roundOf16TeamIds: [],
      quarterFinalTeamIds: [],
      semiFinalTeamIds: [],
      finalTeamIds: [],
      championTeamId: null,
    },
  };
}

function getPotentialAnticipationPoints(scoring: {
  groupQualifiedPoints: number;
  bestThirdPoints: number;
  roundOf16Points: number;
  quarterFinalPoints: number;
  semiFinalPoints: number;
  finalPoints: number;
  championPoints: number;
}) {
  return (
    16 * scoring.groupQualifiedPoints +
    anticipationStageLimits.bestThirdTeamIds * scoring.bestThirdPoints +
    anticipationStageLimits.roundOf16TeamIds * scoring.roundOf16Points +
    anticipationStageLimits.quarterFinalTeamIds * scoring.quarterFinalPoints +
    anticipationStageLimits.semiFinalTeamIds * scoring.semiFinalPoints +
    anticipationStageLimits.finalTeamIds * scoring.finalPoints +
    scoring.championPoints
  );
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Sin partidos programados";
  }

  return formatLongMatchDate(value);
}

function formatGoalDifference(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function TeamChip({
  team,
  active,
  onClick,
  disabled = false,
}: {
  team: any;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-60 hover:bg-card" : ""}`}
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStandingsGroup, setSelectedStandingsGroup] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-anticipation"],
    queryFn: () => apiFetch<any>("/api/participant/anticipation"),
    refetchInterval: 30000,
  });
  const [draftForm, setDraftForm] = useState<AnticipationForm | null>(null);
  const teamGroupLookup = useMemo<Map<string, string | null>>(
    () => new Map<string, string | null>((data?.teams ?? []).map((team: any) => [String(team._id), team.group ?? null])),
    [data?.teams],
  );
  const baseForm = useMemo(
    () =>
      data
        ? sanitizeAnticipationForm(
            data.prediction
              ? {
                  groupRankings: data.prediction.groupRankings,
                  stageSelections: {
                    bestThirdTeamIds: data.prediction.stageSelections?.bestThirdTeamIds ?? [],
                    roundOf16TeamIds: data.prediction.stageSelections?.roundOf16TeamIds ?? [],
                    quarterFinalTeamIds: data.prediction.stageSelections?.quarterFinalTeamIds ?? [],
                    semiFinalTeamIds: data.prediction.stageSelections?.semiFinalTeamIds ?? [],
                    finalTeamIds: data.prediction.stageSelections?.finalTeamIds ?? [],
                    championTeamId: data.prediction.stageSelections?.championTeamId ?? null,
                  },
                }
              : createEmptyForm(data.groups ?? []),
            { teamGroupLookup },
          )
        : null,
    [data, teamGroupLookup],
  );
  const form = draftForm ?? baseForm;
  const candidatePools = useMemo(() => (form ? getAnticipationCandidatePools(form) : null), [form]);
  const candidateSets = useMemo(
    () =>
      candidatePools
        ? {
            groupQualified: new Set(candidatePools.groupQualifiedTeamIds),
            roundOf16: new Set(candidatePools.roundOf16CandidateIds),
            quarterFinal: new Set(candidatePools.quarterFinalCandidateIds),
            semiFinal: new Set(candidatePools.semiFinalCandidateIds),
            final: new Set(candidatePools.finalCandidateIds),
          }
        : null,
    [candidatePools],
  );
  const bestThirdCandidates = useMemo(
    () => (data?.teams ?? []).filter((team: any) => team.group && !candidateSets?.groupQualified.has(team._id)),
    [data?.teams, candidateSets],
  );
  const selectedBestThirdGroups = useMemo(() => {
    const groups = new Set<string>();

    for (const teamId of form?.stageSelections.bestThirdTeamIds ?? []) {
      const group = teamGroupLookup.get(teamId);
      if (group) {
        groups.add(group);
      }
    }

    return groups;
  }, [form?.stageSelections.bestThirdTeamIds, teamGroupLookup]);
  const roundOf16Candidates = useMemo(
    () => (data?.teams ?? []).filter((team: any) => candidateSets?.roundOf16.has(team._id)),
    [data?.teams, candidateSets],
  );
  const quarterFinalCandidates = useMemo(
    () => (data?.teams ?? []).filter((team: any) => candidateSets?.quarterFinal.has(team._id)),
    [data?.teams, candidateSets],
  );
  const semiFinalCandidates = useMemo(
    () => (data?.teams ?? []).filter((team: any) => candidateSets?.semiFinal.has(team._id)),
    [data?.teams, candidateSets],
  );
  const finalCandidates = useMemo(
    () => (data?.teams ?? []).filter((team: any) => candidateSets?.final.has(team._id)),
    [data?.teams, candidateSets],
  );
  const standingsGroups = useMemo(
    () => (data?.standingsOverview?.groups ?? []).map((group: any) => group.group),
    [data?.standingsOverview?.groups],
  );
  const visibleStandingsGroups = useMemo(
    () =>
      (data?.standingsOverview?.groups ?? []).filter(
        (group: any) => selectedStandingsGroup === "all" || group.group === selectedStandingsGroup,
      ),
    [data?.standingsOverview?.groups, selectedStandingsGroup],
  );
  const isLocked = Boolean(data?.locked);

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
      return resolved ? sanitizeAnticipationForm(updater(resolved), { teamGroupLookup }) : current;
    });

  function updateGroupSelection(group: string, slot: "firstTeamId" | "secondTeamId", teamId: string) {
    if (isLocked) {
      return;
    }

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

  function toggleStageSelection(stageKey: keyof typeof anticipationStageLimits, teamId: string) {
    if (isLocked) {
      return;
    }

    updateForm((current) => {
      const values = current.stageSelections[stageKey];
      const exists = values.includes(teamId);

      if (stageKey === "bestThirdTeamIds" && !exists) {
        const teamGroup = teamGroupLookup.get(teamId);
        const hasAnotherFromSameGroup = values.some((value) => value !== teamId && teamGroupLookup.get(value) === teamGroup);

        if (teamGroup && hasAnotherFromSameGroup) {
          toast.error(`Solo puedes seleccionar un mejor tercero por grupo. Ya elegiste uno del grupo ${teamGroup}.`);
          return current;
        }
      }

      if (!exists && values.length >= anticipationStageLimits[stageKey]) {
        toast.error(`Solo puedes seleccionar ${anticipationStageLimits[stageKey]} equipos en esta fase`);
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
        description="Define antes del primer partido tus clasificados por grupo, mejores terceros, quienes pasan a octavos y el campeon del torneo."
      />

      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cierre general</p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatDateLabel(data?.firstMatchDate ?? null)}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estado</p>
            <p className="mt-2 text-sm font-medium text-foreground">{isLocked ? "Cerrado" : "Abierto para edicion"}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Regla</p>
            <p className="mt-2 text-sm font-medium text-foreground">Puedes editar y guardar cuantas veces quieras hasta el inicio del primer partido.</p>
          </div>
        </div>

        {data?.prediction?.savedAt ? (
          <div className="mt-4 panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ultima actualizacion</p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatDateLabel(data.prediction.savedAt)}</p>
          </div>
        ) : null}

        {data?.settings ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="panel-muted rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-foreground">Resumen de puntos</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Cada acierto suma por equipo. Al cambiar una fase, las selecciones incompatibles de las siguientes se limpian automaticamente.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Top 2 por grupo</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.groupQualifiedPoints} pts</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
                  <span className="text-muted-foreground">Mejores terceros</span>
                  <span className="font-semibold text-foreground">{data.settings.anticipationScoring.bestThirdPoints} pts</span>
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
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mejores terceros</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {anticipationStageLimits.bestThirdTeamIds * data.settings.anticipationScoring.bestThirdPoints} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Octavos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {anticipationStageLimits.roundOf16TeamIds * data.settings.anticipationScoring.roundOf16Points} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cuartos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {anticipationStageLimits.quarterFinalTeamIds * data.settings.anticipationScoring.quarterFinalPoints} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Semifinal</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {anticipationStageLimits.semiFinalTeamIds * data.settings.anticipationScoring.semiFinalPoints} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Final</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {anticipationStageLimits.finalTeamIds * data.settings.anticipationScoring.finalPoints} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Total maximo</p>
                  <p className="mt-2 text-lg font-semibold text-primary">
                    {getPotentialAnticipationPoints(data.settings.anticipationScoring)} pts
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
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Tabla oficial por grupos</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Esta tabla se arma con los resultados cargados. Los mejores terceros solo aparecen como oficiales cuando el admin los confirma manualmente.
                  </p>
                </div>
                {data.breakdown ? (
                  <button type="button" onClick={() => setDetailOpen(true)} className="btn-secondary">
                    Ver detalle de puntos anticipados
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="xl:col-span-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStandingsGroup("all")}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedStandingsGroup === "all"
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
                      onClick={() => setSelectedStandingsGroup(group)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selectedStandingsGroup === group
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

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="panel rounded-3xl p-5">
                <h3 className="text-lg font-semibold text-foreground">Clasificados oficiales</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Estos bloques solo muestran equipos cuando ya quedaron definidos oficialmente por resultados o por presencia confirmada en la fase siguiente.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ["Mejores terceros", data.standingsOverview?.official?.bestThirdTeams ?? []],
                    ["16vos", data.standingsOverview?.official?.roundOf32Teams ?? []],
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
            </div>
          </section>

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
                              disabled={isLocked}
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
                              disabled={isLocked}
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
              <h2 className="text-xl font-semibold text-foreground">Mejores terceros</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Selecciona hasta {anticipationStageLimits.bestThirdTeamIds} equipos entre los que no dejaste en top 2. Solo puede salir un tercero por grupo.
              </p>
            </div>
            <div className="panel rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Terceros candidatos</h3>
                  <p className="text-sm text-muted-foreground">
                    Seleccionados: {form.stageSelections.bestThirdTeamIds.length} / {anticipationStageLimits.bestThirdTeamIds}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">Maximo un equipo por grupo</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {bestThirdCandidates.map((team: any) => (
                  <TeamChip
                    key={`best-third-${team._id}`}
                    team={team}
                    active={form.stageSelections.bestThirdTeamIds.includes(team._id)}
                    onClick={() => toggleStageSelection("bestThirdTeamIds", team._id)}
                    disabled={
                      isLocked ||
                      (!form.stageSelections.bestThirdTeamIds.includes(team._id) &&
                        Boolean(team.group) &&
                        selectedBestThirdGroups.has(team.group))
                    }
                  />
                ))}
              </div>
              {bestThirdCandidates.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Primero completa los clasificados por grupo para habilitar este bloque.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Clasificados por fase</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Primero se arma automaticamente el grupo de 32 clasificados con tus top 2 y tus mejores terceros. Desde ahi eliges quienes avanzan en cada fase.
              </p>
            </div>
            {[
              ["roundOf16TeamIds", "Octavos de final", anticipationStageLimits.roundOf16TeamIds, roundOf16Candidates, "Solo usa equipos que clasificaste desde grupos y mejores terceros"],
              ["quarterFinalTeamIds", "Cuartos de final", anticipationStageLimits.quarterFinalTeamIds, quarterFinalCandidates, "Solo usa equipos que elegiste para octavos"],
              ["semiFinalTeamIds", "Semifinal", anticipationStageLimits.semiFinalTeamIds, semiFinalCandidates, "Solo usa equipos que elegiste para cuartos"],
              ["finalTeamIds", "Final", anticipationStageLimits.finalTeamIds, finalCandidates, "Solo usa equipos que elegiste para semifinal"],
            ].map(([stageKey, label, limit, teams, helperText]) => (
              <div key={stageKey} className="panel rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">
                      Seleccionados: {form.stageSelections[stageKey as keyof typeof anticipationStageLimits].length} / {limit}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">{helperText}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {(teams as any[]).map((team: any) => (
                    <TeamChip
                      key={`${stageKey}-${team._id}`}
                      team={team}
                      active={form.stageSelections[stageKey as keyof typeof anticipationStageLimits].includes(team._id)}
                      onClick={() => toggleStageSelection(stageKey as keyof typeof anticipationStageLimits, team._id)}
                      disabled={isLocked}
                    />
                  ))}
                </div>
                {(teams as any[]).length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aun no hay equipos habilitados para esta fase.</p> : null}
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <div className="panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-foreground">Campeon</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Selecciona el equipo que se coronara campeon del torneo. Solo puedes elegir entre tus finalistas.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {finalCandidates.map((team: any) => (
                  <TeamChip
                    key={`champion-${team._id}`}
                    team={team}
                    active={form.stageSelections.championTeamId === team._id}
                    onClick={() => {
                      if (isLocked) {
                        return;
                      }

                      updateForm((current) => ({
                        ...current,
                        stageSelections: {
                          ...current.stageSelections,
                          championTeamId: current.stageSelections.championTeamId === team._id ? null : team._id,
                        },
                      }));
                    }}
                    disabled={isLocked}
                  />
                ))}
              </div>
              {finalCandidates.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Primero selecciona tus equipos finalistas.</p> : null}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || isLocked} className="btn-primary">
              {mutation.isPending ? "Guardando..." : data?.prediction ? "Guardar cambios" : "Guardar pronosticos anticipados"}
            </button>
            <button
              type="button"
              onClick={() =>
                setDraftForm(createEmptyForm(data.groups))
              }
              disabled={mutation.isPending || isLocked}
              className="btn-secondary"
            >
              Limpiar seleccion
            </button>
          </div>

          <DetailModal
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            title="Detalle de puntos anticipados"
            description="Aqui ves exactamente por que sumaste puntos en anticipados y cuales selecciones siguen pendientes por definirse."
          >
            {data.breakdown ? (
              <div className="space-y-4">
                <div className="panel-muted rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total actual</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.breakdown.totalPoints} pts</p>
                </div>

                <div className="space-y-3">
                  {data.breakdown.groupDetails.map((group: any) => (
                    <div key={`group-breakdown-${group.group}`} className="panel-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-foreground">Grupo {group.group}</p>
                        <span className="text-sm font-semibold text-primary">{group.pointsAwarded} pts</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {group.resolved ? "Top 2 oficial definido." : "Este grupo sigue pendiente de definirse oficialmente."}
                      </p>
                      <div className="mt-3 space-y-2">
                        {group.selections.map((selection: any) => (
                          <div key={`${group.group}-${selection.slot}`} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm">
                            <span className="text-muted-foreground">
                              {selection.slot}: {selection.team ? selection.team.name : "Sin seleccionar"}
                            </span>
                            <span className={selection.hit ? "font-semibold text-primary" : "text-muted-foreground"}>
                              {selection.hit ? `+${data.settings.anticipationScoring.groupQualifiedPoints}` : "0"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {[
                    data.breakdown.bestThird,
                    data.breakdown.roundOf16,
                    data.breakdown.quarterFinal,
                    data.breakdown.semiFinal,
                    data.breakdown.final,
                  ].map((section: any) => (
                    <div key={section.label} className="panel-muted rounded-2xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{section.label}</p>
                        <span className="text-sm font-semibold text-primary">{section.pointsAwarded} pts</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {section.selections.length ? (
                          section.selections.map((item: any) => (
                            <div key={`${section.label}-${item.team._id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm">
                              <span className="text-muted-foreground">{item.team.name}</span>
                              <span className={item.hit ? "font-semibold text-primary" : "text-muted-foreground"}>
                                {item.hit ? `+${section.pointsPerHit}` : "0"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No hiciste selecciones en este bloque.</p>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="panel-muted rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-foreground">Campeon</p>
                      <span className="text-sm font-semibold text-primary">{data.breakdown.champion.pointsAwarded} pts</span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="rounded-2xl bg-card px-4 py-3 text-muted-foreground">
                        Tu eleccion: {data.breakdown.champion.selection ? data.breakdown.champion.selection.name : "Sin seleccionar"}
                      </div>
                      <div className="rounded-2xl bg-card px-4 py-3 text-muted-foreground">
                        Oficial: {data.breakdown.champion.official ? data.breakdown.champion.official.name : "Aun sin definir"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aun no tienes un desglose disponible para anticipados.</div>
            )}
          </DetailModal>
        </>
      ) : null}
    </div>
  );
}
