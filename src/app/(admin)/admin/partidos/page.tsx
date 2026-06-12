"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { apiFetch, formatMatchDate, formatMatchStage } from "@/lib/utils";

interface TeamOption {
  _id: string;
  name: string;
  shortName: string;
  countryCode: string;
  group?: string | null;
  flagUrl: string;
}

interface MatchListItem {
  _id: string;
  stage: string;
  stadium: string;
  matchDate: string;
  status: string;
  isClosed?: boolean;
  predictionAccessMode?: "scheduled" | "manual_open" | "manual_locked";
  homeTeam: {
    name: string;
    shortName: string;
    flagUrl?: string | null;
  };
  awayTeam: {
    name: string;
    shortName: string;
    flagUrl?: string | null;
  };
}

interface AdminMatchesResponse {
  teams: TeamOption[];
  matches: MatchListItem[];
}

function formatPredictionAccessMode(mode?: "scheduled" | "manual_open" | "manual_locked") {
  if (mode === "manual_open") {
    return "Edicion desbloqueada manualmente";
  }

  if (mode === "manual_locked") {
    return "Edicion bloqueada manualmente";
  }

  return "Edicion automatica por horario";
}

interface TeamPickerProps {
  label: string;
  teams: TeamOption[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
  blockedTeamId?: string;
}

function TeamPicker({ label, teams, selectedTeamId, onSelect, blockedTeamId }: TeamPickerProps) {
  const selectedTeam = teams.find((team) => team._id === selectedTeamId);
  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredTeams = teams.filter((team) => {
    if (normalizedSearchText === "") {
      return true;
    }

    return (
      team.name.toLowerCase().includes(normalizedSearchText) ||
      team.shortName.toLowerCase().includes(normalizedSearchText) ||
      team.countryCode.toLowerCase().includes(normalizedSearchText)
    );
  });

  return (
    <div className="panel-muted rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTeam ? "Equipo seleccionado" : "Selecciona un equipo"}
          </p>
        </div>
        {selectedTeam ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2">
            <Image
              src={selectedTeam.flagUrl}
              alt={selectedTeam.name}
              width={24}
              height={18}
              className="h-[18px] w-6 object-contain"
            />
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{selectedTeam.name}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{selectedTeam.shortName}</p>
            </div>
          </div>
        ) : null}
      </div>

      <input
        placeholder="Buscar pais o sigla"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="field-input mb-4"
      />

      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {filteredTeams.map((team) => {
          const isSelected = team._id === selectedTeamId;
          const isBlocked = team._id === blockedTeamId;

          return (
            <button
              key={team._id}
              type="button"
              onClick={() => onSelect(team._id)}
              disabled={isBlocked}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                isSelected
                  ? "border-primary/20 bg-primary/10"
                  : "border-border bg-card hover:bg-muted",
                isBlocked && "cursor-not-allowed opacity-45",
              )}
            >
              <Image
                src={team.flagUrl}
                alt={team.name}
                width={28}
                height={21}
                className="h-[21px] w-7 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{team.shortName}</p>
              </div>
            </button>
          );
        })}
      </div>
      {filteredTeams.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No hay equipos que coincidan con la busqueda.</p> : null}
    </div>
  );
}

export default function AdminMatchesPage() {
  const queryClient = useQueryClient();
  const [pageLoadedAt] = useState(() => Date.now());
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", stage: "group", group: "", stadium: "", matchDate: "" });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: () => apiFetch<AdminMatchesResponse>("/api/admin/matches"),
  });

  const teams = data?.teams ?? [];
  const homeTeam = teams.find((team) => team._id === form.homeTeamId) ?? null;
  const awayTeam = teams.find((team) => team._id === form.awayTeamId) ?? null;
  const isGroupStage = form.stage === "group";
  const derivedGroup =
    isGroupStage && homeTeam?.group && awayTeam?.group && homeTeam.group === awayTeam.group
      ? homeTeam.group
      : "";
  const hasGroupMismatch = Boolean(isGroupStage && homeTeam && awayTeam && homeTeam.group !== awayTeam.group);
  const missingGroupAssignment = Boolean(isGroupStage && ((homeTeam && !homeTeam.group) || (awayTeam && !awayTeam.group)));

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/matches", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          group: isGroupStage ? derivedGroup : "",
          status: "scheduled",
        }),
      }),
    onSuccess: () => {
      toast.success("Partido creado");
      setForm({ homeTeamId: "", awayTeamId: "", stage: "group", group: "", stadium: "", matchDate: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => apiFetch("/api/admin/matches", { method: "DELETE", body: JSON.stringify({ id: matchId }) }),
    onSuccess: () => {
      toast.success("Partido eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const accessMutation = useMutation({
    mutationFn: ({ matchId, predictionAccessMode }: { matchId: string; predictionAccessMode: "scheduled" | "manual_open" | "manual_locked" }) =>
      apiFetch("/api/admin/matches", {
        method: "PATCH",
        body: JSON.stringify({ id: matchId, predictionAccessMode }),
      }),
    onSuccess: (_, variables) => {
      const actionLabel =
        variables.predictionAccessMode === "manual_open"
          ? "Edicion desbloqueada"
          : variables.predictionAccessMode === "manual_locked"
            ? "Edicion bloqueada"
            : "Partido devuelto a horario automatico";
      toast.success(actionLabel);
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const canCreateMatch =
    form.homeTeamId !== "" &&
    form.awayTeamId !== "" &&
    form.stadium.trim().length >= 2 &&
    form.matchDate !== "" &&
    (!isGroupStage || (!!derivedGroup && !hasGroupMismatch && !missingGroupAssignment));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Programacion" title="Partidos" description="Crea los encuentros del mundial con fecha, estadio, grupo y equipos participantes." />
      <div className="panel space-y-4 rounded-3xl p-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <TeamPicker
            label="Equipo local"
            teams={teams}
            selectedTeamId={form.homeTeamId}
            blockedTeamId={form.awayTeamId || undefined}
            onSelect={(teamId) => setForm((current) => ({ ...current, homeTeamId: teamId }))}
          />
          <TeamPicker
            label="Equipo visitante"
            teams={teams}
            selectedTeamId={form.awayTeamId}
            blockedTeamId={form.homeTeamId || undefined}
            onSelect={(teamId) => setForm((current) => ({ ...current, awayTeamId: teamId }))}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            placeholder="Estadio"
            value={form.stadium}
            onChange={(e) => setForm((current) => ({ ...current, stadium: e.target.value }))}
            className="field-input"
          />
          <select
            value={form.stage}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                stage: e.target.value,
                group: e.target.value === "group" ? current.group : "",
              }))
            }
            className="field-select"
          >
            {["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"].map((stage) => (
              <option key={stage} value={stage}>
                {formatMatchStage(stage)}
              </option>
            ))}
          </select>
          {isGroupStage ? (
            <div className="field-input flex items-center text-sm text-muted-foreground">
              {derivedGroup ? `Grupo ${derivedGroup}` : "El grupo se asigna automaticamente"}
            </div>
          ) : (
            <div className="field-input flex items-center text-sm text-muted-foreground">No aplica para eliminatorias</div>
          )}
          <input
            type="datetime-local"
            value={form.matchDate}
            onChange={(e) => setForm((current) => ({ ...current, matchDate: e.target.value }))}
            className="field-input xl:col-span-2"
          />
        </div>
        {isGroupStage && hasGroupMismatch ? (
          <p className="text-sm text-destructive">En fase de grupos solo puedes enfrentar equipos del mismo grupo.</p>
        ) : null}
        {isGroupStage && !hasGroupMismatch && missingGroupAssignment ? (
          <p className="text-sm text-destructive">Ambos equipos deben tener grupo asignado para crear un partido de fase de grupos.</p>
        ) : null}
        <button type="button" onClick={() => mutation.mutate()} disabled={!canCreateMatch || mutation.isPending} className="btn-primary xl:col-span-3 disabled:cursor-not-allowed disabled:opacity-60">
          {mutation.isPending ? "Guardando..." : "Crear partido"}
        </button>
      </div>
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando partidos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="grid gap-4">
        {(data?.matches ?? []).map((match) => (
          <div key={match._id} className="panel rounded-3xl p-5 text-sm text-muted-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {match.homeTeam.flagUrl ? (
                    <Image
                      src={match.homeTeam.flagUrl}
                      alt={match.homeTeam.name}
                      width={28}
                      height={21}
                      className="h-[21px] w-7 object-contain"
                    />
                  ) : null}
                  <span className="font-medium text-foreground">{match.homeTeam.name}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">vs</span>
                <div className="flex items-center gap-3">
                  {match.awayTeam.flagUrl ? (
                    <Image
                      src={match.awayTeam.flagUrl}
                      alt={match.awayTeam.name}
                      width={28}
                      height={21}
                      className="h-[21px] w-7 object-contain"
                    />
                  ) : null}
                  <span className="font-medium text-foreground">{match.awayTeam.name}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:items-end">
                <div>
                  {formatMatchStage(match.stage)} | {formatMatchDate(match.matchDate)} | {match.stadium}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      match.predictionAccessMode === "manual_open"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : match.predictionAccessMode === "manual_locked"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {formatPredictionAccessMode(match.predictionAccessMode)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      match.isClosed ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/15 bg-primary/8 text-primary",
                    )}
                  >
                    {match.isClosed ? "Cerrado para usuarios" : "Abierto para usuarios"}
                  </span>
                </div>
                {match.status !== "finished" ? (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => accessMutation.mutate({ matchId: match._id, predictionAccessMode: "manual_open" })}
                      disabled={accessMutation.isPending}
                      className="rounded-xl border border-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Desbloquear edicion
                    </button>
                    <button
                      type="button"
                      onClick={() => accessMutation.mutate({ matchId: match._id, predictionAccessMode: "manual_locked" })}
                      disabled={accessMutation.isPending}
                      className="rounded-xl border border-amber-500/20 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-500/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Bloquear edicion
                    </button>
                    <button
                      type="button"
                      onClick={() => accessMutation.mutate({ matchId: match._id, predictionAccessMode: "scheduled" })}
                      disabled={accessMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Usar horario automatico
                    </button>
                  </div>
                ) : null}
                {match.status === "scheduled" && new Date(match.matchDate).getTime() > pageLoadedAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Se eliminara el partido programado y los pronosticos asociados. Deseas continuar?")) {
                        deleteMutation.mutate(match._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-xl border border-destructive/20 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? "Eliminando..." : "Eliminar partido"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
