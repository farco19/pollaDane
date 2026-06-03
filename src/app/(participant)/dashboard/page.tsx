/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Medal, ShieldCheck, Target, Trophy, Wallet } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { MatchCard } from "@/components/matches/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch, formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-dashboard"],
    queryFn: () => apiFetch<any>("/api/participant/dashboard"),
  });

  if (isLoading) {
    return <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando dashboard...</div>;
  }

  if (error) {
    return <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tu panorama"
        title="Resumen general"
        description="Consulta tus puntos, posicion actual, premio acumulado y los siguientes partidos para pronosticar."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Puntos" value={String(data.summary.totalPoints)} description="Puntaje acumulado en la competencia." icon={Trophy} />
        <StatCard title="Partidos" value={String(data.summary.matchPoints)} description="Puntos obtenidos por marcadores y resultados." icon={Target} />
        <StatCard title="Anticipados" value={String(data.summary.anticipationPoints)} description="Puntos obtenidos por clasificados y campeon." icon={ShieldCheck} />
        <StatCard title="Posicion" value={`#${data.summary.rank}`} description="Tu lugar actual en la tabla." icon={Medal} />
        <StatCard title="Premio" value={formatCurrency(data.summary.prizePool)} description={`Aporte por persona: ${formatCurrency(data.summary.entryFee)}`} icon={Wallet} />
      </section>

      <section className="panel rounded-3xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Desglose de tu puntaje</h2>
            <p className="mt-1 text-sm text-muted-foreground">Asi se compone tu total actual entre resultados de partidos y pronosticos anticipados.</p>
          </div>
          <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
            Exactos acertados: {data.summary.exactHits}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{data.summary.totalPoints}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Por partidos</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{data.summary.matchPoints}</p>
          </div>
          <div className="panel-muted rounded-2xl px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Por anticipados</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{data.summary.anticipationPoints}</p>
          </div>
        </div>
      </section>

      <section>
        <LeaderboardTable entries={data.leaderboardPreview} prizePool={data.summary.prizePool} />
      </section>

      <section className="space-y-4">
        <div className="panel rounded-3xl p-5">
          <h2 className="text-xl font-semibold text-foreground">Proximos partidos</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Pronostica antes del inicio. Una vez guardes, queda bloqueado.
          </p>
        </div>
        {data.upcomingMatches.length ? (
          data.upcomingMatches.map((match: any) => <MatchCard key={match._id} match={match} />)
        ) : (
          <div className="state-panel rounded-3xl p-6 text-muted-foreground">No hay partidos programados.</div>
        )}
      </section>
    </div>
  );
}
