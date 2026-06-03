/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ShieldCheck, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch, formatCurrency, formatMatchStage } from "@/lib/utils";

export default function AdminDashboardPage() {
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: () => apiFetch<any[]>("/api/admin/users") });
  const matchesQuery = useQuery({ queryKey: ["admin-matches"], queryFn: () => apiFetch<any>("/api/admin/matches") });
  const codesQuery = useQuery({ queryKey: ["admin-codes"], queryFn: () => apiFetch<any[]>("/api/admin/invite-codes") });
  const settingsQuery = useQuery({ queryKey: ["public-settings"], queryFn: () => apiFetch<any>("/api/settings/public") });

  const loading = usersQuery.isLoading || matchesQuery.isLoading || codesQuery.isLoading || settingsQuery.isLoading;
  const error = usersQuery.error || matchesQuery.error || codesQuery.error || settingsQuery.error;

  if (loading) return <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando panel...</div>;
  if (error) return <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div>;

  const matches = (matchesQuery.data?.matches ?? []) as any[];
  const pendingResults = matches.filter((match) => match.homeScore == null || match.awayScore == null).length;
  const usedCodes = (codesQuery.data ?? []).filter((code) => code.status === "used").length;
  const users = usersQuery.data ?? [];
  const settings = settingsQuery.data ?? { prizePool: 0, entryFee: 0 };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administracion" title="Dashboard general" description="Supervisa inscritos, codigos entregados, partidos cargados y premio acumulado en un solo tablero." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Usuarios" value={String(users.length)} description="Cuentas creadas en la aplicacion." icon={Users} />
        <StatCard title="Premio" value={formatCurrency(settings.prizePool)} description={`Aporte actual: ${formatCurrency(settings.entryFee)}`} icon={Wallet} />
        <StatCard title="Codigos usados" value={String(usedCodes)} description="Participantes que ya registraron pago." icon={ShieldCheck} />
        <StatCard title="Partidos sin resultado" value={String(pendingResults)} description="Encuentros pendientes por calificar." icon={CalendarDays} />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-foreground">Ultimos usuarios</h2>
          <div className="mt-4 space-y-3 text-sm">
            {users.slice(0, 6).map((user) => (
              <div key={user._id} className="panel-muted rounded-2xl px-4 py-3 text-foreground">
                {user.name} - {user.email} - {user.role}
              </div>
            ))}
          </div>
        </div>
        <div className="panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-foreground">Proximos partidos</h2>
          <div className="mt-4 space-y-3 text-sm">
            {matches.slice(0, 6).map((match) => (
              <div key={match._id} className="panel-muted rounded-2xl px-4 py-3 text-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {match.homeTeam.flagUrl ? (
                      <Image
                        src={match.homeTeam.flagUrl}
                        alt={match.homeTeam.name}
                        width={24}
                        height={18}
                        className="h-[18px] w-6 object-contain"
                      />
                    ) : null}
                    <span>{match.homeTeam.shortName}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">vs</span>
                  <div className="flex items-center gap-2">
                    {match.awayTeam.flagUrl ? (
                      <Image
                        src={match.awayTeam.flagUrl}
                        alt={match.awayTeam.name}
                        width={24}
                        height={18}
                        className="h-[18px] w-6 object-contain"
                      />
                    ) : null}
                    <span>{match.awayTeam.shortName}</span>
                  </div>
                  <span className="text-muted-foreground">- {formatMatchStage(match.stage)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
