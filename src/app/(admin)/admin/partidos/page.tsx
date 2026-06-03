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
  flagUrl: string;
}

interface MatchListItem {
  _id: string;
  stage: string;
  stadium: string;
  matchDate: string;
  status: string;
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
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", stage: "group", group: "A", stadium: "", matchDate: "" });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: () => apiFetch<AdminMatchesResponse>("/api/admin/matches"),
  });

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/matches", { method: "POST", body: JSON.stringify({ ...form, status: "scheduled" }) }),
    onSuccess: () => {
      toast.success("Partido creado");
      setForm({ homeTeamId: "", awayTeamId: "", stage: "group", group: "A", stadium: "", matchDate: "" });
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

  const teams = data?.teams ?? [];

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
            onChange={(e) => setForm((current) => ({ ...current, stage: e.target.value }))}
            className="field-select"
          >
            {["group", "round_of_16", "quarter_final", "semi_final", "third_place", "final"].map((stage) => (
              <option key={stage} value={stage}>
                {formatMatchStage(stage)}
              </option>
            ))}
          </select>
          <input
            placeholder="Grupo"
            value={form.group}
            onChange={(e) => setForm((current) => ({ ...current, group: e.target.value }))}
            className="field-input"
          />
          <input
            type="datetime-local"
            value={form.matchDate}
            onChange={(e) => setForm((current) => ({ ...current, matchDate: e.target.value }))}
            className="field-input xl:col-span-2"
          />
        </div>
        <button type="button" onClick={() => mutation.mutate()} className="btn-primary xl:col-span-3">
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
