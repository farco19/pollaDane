/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

export default function LeaderboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch<any>("/api/leaderboard"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Competencia"
        title="Tabla de posiciones"
        description="Sigue en tiempo real quien lidera la polla, revisa el podio actual y cuanto se llevarian primero, segundo y tercero."
      />
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando tabla...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      {data ? <LeaderboardTable entries={data.leaderboard} prizePool={data.prizePool} podium={data.podium} /> : null}
    </div>
  );
}

