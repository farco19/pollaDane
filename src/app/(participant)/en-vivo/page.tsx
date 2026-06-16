"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, formatMatchDate, formatMatchStage } from "@/lib/utils";

interface LivePredictionRow {
  userId: string;
  name: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  hasPrediction: boolean;
}

interface LivePredictionMatch {
  _id: string;
  stage: string;
  group: string | null;
  stadium: string;
  matchDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    _id: string;
    name: string;
    shortName: string;
    flagUrl: string | null;
  };
  awayTeam: {
    _id: string;
    name: string;
    shortName: string;
    flagUrl: string | null;
  };
  rows: LivePredictionRow[];
}

interface LivePredictionsResponse {
  matches: LivePredictionMatch[];
}

function formatPrediction(row: LivePredictionRow) {
  if (!row.hasPrediction || row.predictedHomeScore == null || row.predictedAwayScore == null) {
    return "Sin pronostico";
  }

  return `${row.predictedHomeScore} - ${row.predictedAwayScore}`;
}

export default function LivePredictionsPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-live-predictions"],
    queryFn: () => apiFetch<LivePredictionsResponse>("/api/participant/live-predictions"),
    refetchInterval: 20 * 1000,
    refetchOnWindowFocus: true,
  });

  const matches = useMemo(() => data?.matches ?? [], [data?.matches]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match._id === selectedMatchId) ?? matches[0] ?? null,
    [matches, selectedMatchId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partidos live"
        title="Pronosticos en vivo"
        description="Mira solo los partidos que estan en juego, compara el marcador real con los pronosticos de los participantes y cambia de pestaña cuando haya partidos simultaneos."
      />

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando partidos en vivo...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}

      {!isLoading && !error && matches.length === 0 ? (
        <div className="state-panel rounded-3xl p-6 text-muted-foreground">
          No hay partidos en juego en este momento. Cuando empiece uno, aqui veras los pronosticos de todos los participantes.
        </div>
      ) : null}

      {matches.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-3">
            {matches.map((match) => {
              const isActive = match._id === selectedMatch?._id;

              return (
                <button
                  key={match._id}
                  type="button"
                  onClick={() => setSelectedMatchId(match._id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {match.homeTeam.shortName} {match.homeScore ?? "-"} - {match.awayScore ?? "-"} {match.awayTeam.shortName}
                  </p>
                  <p className={`mt-1 text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {formatMatchStage(match.stage)}
                    {match.group ? ` | Grupo ${match.group}` : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedMatch ? (
            <div className="space-y-4">
              <div className="panel rounded-3xl p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatMatchStage(selectedMatch.stage)}</span>
                      {selectedMatch.group ? <span>Grupo {selectedMatch.group}</span> : null}
                      <span>{formatMatchDate(selectedMatch.matchDate)}</span>
                      <span>{selectedMatch.stadium}</span>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        {selectedMatch.homeTeam.flagUrl ? (
                          <Image
                            src={selectedMatch.homeTeam.flagUrl}
                            alt={selectedMatch.homeTeam.name}
                            width={36}
                            height={27}
                            className="h-[27px] w-9 object-contain"
                          />
                        ) : null}
                        <div>
                          <p className="text-lg font-semibold text-foreground">{selectedMatch.homeTeam.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedMatch.homeTeam.shortName}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-center">
                        <p className="text-xs uppercase tracking-[0.16em] text-primary">Marcador real</p>
                        <p className="mt-1 text-3xl font-semibold text-foreground">
                          {selectedMatch.homeScore ?? "-"} - {selectedMatch.awayScore ?? "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedMatch.awayTeam.flagUrl ? (
                          <Image
                            src={selectedMatch.awayTeam.flagUrl}
                            alt={selectedMatch.awayTeam.name}
                            width={36}
                            height={27}
                            className="h-[27px] w-9 object-contain"
                          />
                        ) : null}
                        <div>
                          <p className="text-lg font-semibold text-foreground">{selectedMatch.awayTeam.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedMatch.awayTeam.shortName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <p>
                      Participantes visibles: <span className="font-semibold text-foreground">{selectedMatch.rows.length}</span>
                    </p>
                    <p className="mt-1">
                      Pronosticos enviados:{" "}
                      <span className="font-semibold text-foreground">
                        {selectedMatch.rows.filter((row) => row.hasPrediction).length}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:hidden">
                {selectedMatch.rows.map((row) => (
                  <article key={row.userId} className="panel-muted rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{row.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Pronostico: {formatPrediction(row)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Real ahora</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {selectedMatch.homeScore ?? "-"} - {selectedMatch.awayScore ?? "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="panel hidden overflow-x-auto rounded-3xl md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Participante</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Pronostico</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Resultado real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMatch.rows.map((row) => (
                      <tr key={row.userId} className="border-t border-border transition-colors hover:bg-muted/60">
                        <td className="px-5 py-4 font-medium text-foreground">{row.name}</td>
                        <td className="px-5 py-4 text-muted-foreground">{formatPrediction(row)}</td>
                        <td className="px-5 py-4 text-foreground">
                          {selectedMatch.homeScore ?? "-"} - {selectedMatch.awayScore ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
