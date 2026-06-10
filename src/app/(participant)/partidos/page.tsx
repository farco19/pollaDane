/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/matches/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { getColombiaDateKey } from "@/lib/match-datetime";
import { apiFetch } from "@/lib/utils";

export default function MatchesPage() {
  const [searchText, setSearchText] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-matches"],
    queryFn: () => apiFetch<any[]>("/api/participant/matches"),
  });

  const matches = useMemo(() => data ?? [], [data]);
  const availableGroups = useMemo(
    () =>
      Array.from(new Set(matches.map((match) => match.group?.trim()).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [matches],
  );
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      matches.filter((match) => {
        const matchesGroup = groupFilter === "all" || (match.group ?? "") === groupFilter;
        const matchesDate = dateFilter === "" || getColombiaDateKey(match.matchDate) === dateFilter;
        const haystack = [
          match.homeTeam?.name,
          match.homeTeam?.shortName,
          match.awayTeam?.name,
          match.awayTeam?.shortName,
          match.stadium,
          match.group ? `grupo ${match.group}` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesText = normalizedSearchText === "" || haystack.includes(normalizedSearchText);

        return matchesGroup && matchesDate && matchesText;
      }),
    [matches, groupFilter, dateFilter, normalizedSearchText],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendario"
        title="Partidos y pronosticos"
        description="Explora todos los partidos del torneo, filtra por grupo, texto o fecha y edita tu pronostico hasta 15 minutos antes de cada partido."
      />

      <div className="panel rounded-3xl p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_auto]">
          <input
            placeholder="Buscar por pais, sigla, estadio o grupo"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="field-input"
          />
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="field-select">
            <option value="all">Todos los grupos</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                Grupo {group}
              </option>
            ))}
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="field-input" />
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setGroupFilter("all");
              setDateFilter("");
            }}
            className="btn-secondary"
          >
            Limpiar filtros
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Mostrando {filtered.length} de {matches.length} partidos.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {availableGroups.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setGroupFilter(group)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              groupFilter === group
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Grupo {group}
          </button>
        ))}
        {availableGroups.length ? (
          <button
            type="button"
            onClick={() => setGroupFilter("all")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              groupFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Todos
          </button>
        ) : null}
      </div>

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando partidos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="grid gap-5">
        {filtered.map((match) => (
          <MatchCard
            key={`${match._id}-${match.prediction?.predictedHomeScore ?? "x"}-${match.prediction?.predictedAwayScore ?? "x"}-${match.isClosed ? "closed" : "open"}`}
            match={match}
          />
        ))}
      </div>
      {!isLoading && !error && filtered.length === 0 ? (
        <div className="state-panel rounded-3xl p-6 text-muted-foreground">No hay partidos que coincidan con los filtros seleccionados.</div>
      ) : null}
    </div>
  );
}
