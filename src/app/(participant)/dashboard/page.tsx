/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Medal,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { MatchCard } from "@/components/matches/match-card";
import { PushNotificationManager } from "@/components/push/push-notification-manager";
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

  const scoringCards = [
    {
      title: "Marcador exacto",
      points: data.rules.matchScoring.exactScorePoints + data.rules.matchScoring.winnerPoints,
      description: "Aciertas el marcador completo y recibes el mejor puntaje por partido.",
      icon: Trophy,
    },
    {
      title: "Ganador correcto",
      points: data.rules.matchScoring.winnerPoints,
      description: "Si no aciertas el marcador, aun sumas por elegir bien al ganador.",
      icon: Target,
    },
    {
      title: "Empate correcto",
      points: data.rules.matchScoring.drawPoints,
      description: "Cuando anticipas empate y el juego termina igualado, ganas puntos.",
      icon: CheckCircle2,
    },
    {
      title: "Campeon acertado",
      points: data.rules.anticipationScoring.championPoints,
      description: "Los anticipados pueden darte un salto fuerte en la parte final del torneo.",
      icon: ShieldCheck,
    },
  ];

  const examples = [
    {
      title: "Exacto",
      text: `Si pronosticas 2 - 1 y termina 2 - 1, ganas ${scoringCards[0].points} puntos.`,
    },
    {
      title: "Ganador",
      text: `Si pronosticas 1 - 0 y termina 3 - 1, ganas ${data.rules.matchScoring.winnerPoints} puntos.`,
    },
    {
      title: "Anticipado",
      text: `Si tu campeon es correcto, sumas ${data.rules.anticipationScoring.championPoints} puntos.`,
    },
  ];
  const podium = data.podium ?? [];
  const currentPodiumEntry = podium.find((entry: any) => entry.rank === data.summary.rank) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tu panorama"
        title="Resumen general"
        description="Consulta tus puntos, entiende como se calculan y revisa los siguientes partidos para acercarte al liderato."
      />

      <PushNotificationManager />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tu estado actual</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Asi vas en la competencia</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tu puntaje mezcla aciertos de partidos y anticipados. Mientras mas exactos pegues y mejores
                picks tengas en fases finales, mas rapido subes.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm font-medium text-primary">
              #{data.summary.rank} en la tabla
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="size-4 text-primary" />
                Participantes
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{data.summary.participants}</p>
              <p className="mt-2 text-sm text-muted-foreground">Competidores actualmente activos en la polla.</p>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="size-4 text-primary" />
                Acumulado
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {formatCurrency(data.summary.prizePool)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Aporte individual: {formatCurrency(data.summary.entryFee)}
              </p>
            </div>
            <div className="panel-muted rounded-2xl p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock3 className="size-4 text-primary" />
                Evaluados
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{data.summary.predictionsScored}</p>
              <p className="mt-2 text-sm text-muted-foreground">Pronósticos tuyos que ya entregaron puntaje oficial.</p>
            </div>
          </div>
        </div>

        <div className="panel rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Que hacer para subir</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Ruta corta para ganar mas</h2>
          <div className="mt-5 space-y-3">
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ArrowUpRight className="size-4 text-primary" />
                Prioriza exactos
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Cada exacto hoy vale {scoringCards[0].points} puntos, mas que un simple acierto de ganador.
              </p>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                No ignores anticipados
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tu campeon correcto puede darte {data.rules.anticipationScoring.championPoints} puntos de una vez.
              </p>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Medal className="size-4 text-primary" />
                Tu progreso actual
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Llevas {data.summary.exactHits} exactos, {data.summary.matchPoints} puntos por partidos y {data.summary.anticipationPoints} por anticipados.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <StatCard title="Puntos" value={String(data.summary.totalPoints)} description="Puntaje acumulado en la competencia." icon={Trophy} />
        <StatCard title="Partidos" value={String(data.summary.matchPoints)} description="Puntos obtenidos por marcadores y resultados." icon={Target} />
        <StatCard title="Anticipados" value={String(data.summary.anticipationPoints)} description="Puntos obtenidos por clasificados y campeon." icon={ShieldCheck} />
        <StatCard title="Posicion" value={`#${data.summary.rank}`} description="Tu lugar actual en la tabla." icon={Medal} />
        <StatCard title="Premio" value={formatCurrency(data.summary.prizePool)} description={`Aporte por persona: ${formatCurrency(data.summary.entryFee)}`} icon={Wallet} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-3xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Podio actual</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Asi va hoy el reparto del premio entre primero, segundo y tercero.
              </p>
            </div>
            <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
              Reparto: {data.summary.prizeDistribution.firstPlacePercentage}% / {data.summary.prizeDistribution.secondPlacePercentage}% / {data.summary.prizeDistribution.thirdPlacePercentage}%
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {podium.map((entry: any) => {
              const tone =
                entry.rank === 1
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-700"
                  : entry.rank === 2
                    ? "border-slate-300/40 bg-slate-300/15 text-slate-700"
                    : "border-orange-300/35 bg-orange-300/10 text-orange-700";

              return (
                <div key={`dashboard-podium-${entry.userId}`} className={`rounded-3xl border p-4 ${tone}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">#{entry.rank}</p>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{entry.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.totalPoints} pts</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.16em]">{entry.percentage}% del premio</p>
                  <p className="mt-2 text-xl font-semibold">{formatCurrency(entry.prizeAmount)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-foreground">Tu premio estimado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esto es lo que estarias cobrando si la tabla quedara como va hoy.
          </p>
          {currentPodiumEntry ? (
            <div className="panel-muted mt-4 rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Estas en zona de premio</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">#{currentPodiumEntry.rank}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Hoy te llevarias el {currentPodiumEntry.percentage}% del premio acumulado.
              </p>
              <p className="mt-4 text-3xl font-semibold text-primary">{formatCurrency(currentPodiumEntry.prizeAmount)}</p>
            </div>
          ) : (
            <div className="panel-muted mt-4 rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Aun fuera del podio</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">#{data.summary.rank}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Necesitas entrar al top 3 para llevarte premio. Hoy el tercer lugar se llevaria{" "}
                {podium[2] ? formatCurrency(podium[2].prizeAmount) : formatCurrency(0)}.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-3xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Desglose de tu puntaje</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Asi se compone tu total actual entre resultados de partidos y pronosticos anticipados.
              </p>
            </div>
            <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
              Exactos: {data.summary.exactHits}
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
        </div>

        <div className="panel rounded-3xl p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Como ganas puntos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Estas son las reglas que mas te impactan en el ranking.</p>
          </div>
          <div className="mt-4 grid gap-3">
            {scoringCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="panel-muted rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.title}
                    </div>
                    <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-sm font-semibold text-primary">
                      +{item.points}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <LeaderboardTable entries={data.leaderboardPreview} prizePool={data.summary.prizePool} />

        <div className="panel rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-foreground">Ejemplos para leer tu puntaje</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Asi se traduce el sistema de puntos en situaciones reales del torneo.
          </p>
          <div className="mt-4 space-y-3">
            {examples.map((example) => (
              <div key={example.title} className="panel-muted rounded-2xl p-4">
                <p className="text-sm font-semibold text-foreground">{example.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{example.text}</p>
              </div>
            ))}
          </div>
        </div>
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
