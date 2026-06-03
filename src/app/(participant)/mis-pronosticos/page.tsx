/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/matches/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

export default function PredictionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-predictions"],
    queryFn: () => apiFetch<any[]>("/api/participant/predictions"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tus jugadas"
        title="Mis pronosticos"
        description="Revisa cada marcador enviado, los resultados oficiales y los puntos obtenidos por partido."
      />

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando pronosticos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="grid gap-5">
        {(data ?? []).map((match) => (
          <MatchCard key={match._id} match={match} readOnly />
        ))}
      </div>
    </div>
  );
}

