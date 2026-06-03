"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, formatMatchDate } from "@/lib/utils";

interface AdminResultMatch {
  _id: string;
  matchDate: string;
  stadium: string;
  homeScore?: number | null;
  awayScore?: number | null;
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

interface AdminResultsResponse {
  matches: AdminResultMatch[];
}

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: () => apiFetch<AdminResultsResponse>("/api/admin/matches"),
  });

  const mutation = useMutation({
    mutationFn: ({ matchId, homeScore, awayScore }: { matchId: string; homeScore: number; awayScore: number }) =>
      apiFetch(`/api/admin/results/${matchId}`, { method: "POST", body: JSON.stringify({ homeScore, awayScore, status: "finished" }) }),
    onSuccess: () => {
      toast.success("Resultado cargado y tabla recalculada");
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Resultados oficiales" title="Carga diaria de marcadores" description="Ingresa el marcador final de cada partido jugado para recalcular puntos y actualizar la tabla." />
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando partidos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="grid gap-4">
        {(data?.matches ?? []).map((match) => (
          <div key={match._id} className="panel rounded-3xl p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
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
                    <h2 className="text-lg font-semibold text-foreground">{match.homeTeam.name}</h2>
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
                    <h2 className="text-lg font-semibold text-foreground">{match.awayTeam.name}</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{formatMatchDate(match.matchDate)} | {match.stadium}</p>
                <p className="mt-1 text-sm font-medium text-primary">
                  Resultado actual: {match.homeTeam.shortName} {match.homeScore ?? "-"} - {match.awayScore ?? "-"} {match.awayTeam.shortName}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[120px_120px_auto] sm:items-center">
                <input type="number" min={0} placeholder="Local" value={scores[match._id]?.home ?? ""} onChange={(e) => setScores((current) => ({ ...current, [match._id]: { home: e.target.value, away: current[match._id]?.away ?? "" } }))} className="field-input" />
                <input type="number" min={0} placeholder="Visitante" value={scores[match._id]?.away ?? ""} onChange={(e) => setScores((current) => ({ ...current, [match._id]: { home: current[match._id]?.home ?? "", away: e.target.value } }))} className="field-input" />
                <button type="button" onClick={() => mutation.mutate({ matchId: match._id, homeScore: Number(scores[match._id]?.home ?? 0), awayScore: Number(scores[match._id]?.away ?? 0) })} className="btn-primary">
                  Guardar resultado
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

