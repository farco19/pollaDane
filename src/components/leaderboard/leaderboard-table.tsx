import { formatCurrency } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  matchPoints: number;
  anticipationPoints: number;
  exactHits: number;
  winnerHits: number;
  drawHits: number;
}

interface PodiumEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  prizeAmount: number;
  percentage: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  prizePool?: number;
  podium?: PodiumEntry[];
}

function getPodiumStyle(rank: number) {
  if (rank === 1) {
    return {
      panel: "border-amber-400/30 bg-gradient-to-b from-amber-400/10 via-card to-card",
      badge: "border-amber-400/30 bg-amber-400/15 text-amber-700",
      label: "text-amber-700",
      amount: "text-amber-700",
    };
  }

  if (rank === 2) {
    return {
      panel: "border-slate-300/40 bg-gradient-to-b from-slate-300/15 via-card to-card",
      badge: "border-slate-300/40 bg-slate-300/20 text-slate-700",
      label: "text-slate-700",
      amount: "text-slate-700",
    };
  }

  return {
    panel: "border-orange-300/35 bg-gradient-to-b from-orange-300/10 via-card to-card",
    badge: "border-orange-300/35 bg-orange-300/15 text-orange-700",
    label: "text-orange-700",
    amount: "text-orange-700",
  };
}

export function LeaderboardTable({ entries, prizePool, podium }: LeaderboardTableProps) {
  const firstPlace = podium?.find((entry) => entry.rank === 1);
  const secondPlace = podium?.find((entry) => entry.rank === 2);
  const thirdPlace = podium?.find((entry) => entry.rank === 3);

  return (
    <div className="space-y-4">
      {podium?.length ? (
        <div className="panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Podio actual</h3>
              <p className="text-sm text-muted-foreground">Asi va el reparto del premio entre primero, segundo y tercero.</p>
            </div>
            {typeof prizePool === "number" ? (
              <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
                Premio total: {formatCurrency(prizePool)}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:items-end">
            {secondPlace ? (
              <article className={`panel order-2 rounded-3xl border p-5 lg:order-1 ${getPodiumStyle(2).panel}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${getPodiumStyle(2).label}`}>Segundo lugar</p>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getPodiumStyle(2).badge}`}>
                  #2
                </div>
                <h4 className="mt-4 text-xl font-semibold text-foreground">{secondPlace.name}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{secondPlace.totalPoints} pts</p>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{secondPlace.percentage}% del premio</p>
                  <p className={`mt-2 text-xl font-semibold ${getPodiumStyle(2).amount}`}>{formatCurrency(secondPlace.prizeAmount)}</p>
                </div>
              </article>
            ) : null}

            {firstPlace ? (
              <article className={`panel order-1 rounded-3xl border p-6 shadow-[0_18px_50px_-24px_rgba(245,158,11,0.5)] lg:order-2 lg:scale-[1.06] ${getPodiumStyle(1).panel}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${getPodiumStyle(1).label}`}>Primer lugar</p>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getPodiumStyle(1).badge}`}>
                  #1
                </div>
                <h4 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-foreground">{firstPlace.name}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{firstPlace.totalPoints} pts</p>
                <div className="mt-4 rounded-2xl border border-amber-400/25 bg-card/85 px-4 py-5">
                  <p className={`text-xs uppercase tracking-[0.16em] ${getPodiumStyle(1).label}`}>{firstPlace.percentage}% del premio</p>
                  <p className={`mt-2 text-3xl font-semibold ${getPodiumStyle(1).amount}`}>{formatCurrency(firstPlace.prizeAmount)}</p>
                </div>
              </article>
            ) : null}

            {thirdPlace ? (
              <article className={`panel order-3 rounded-3xl border p-5 ${getPodiumStyle(3).panel}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${getPodiumStyle(3).label}`}>Tercer lugar</p>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getPodiumStyle(3).badge}`}>
                  #3
                </div>
                <h4 className="mt-4 text-xl font-semibold text-foreground">{thirdPlace.name}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{thirdPlace.totalPoints} pts</p>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{thirdPlace.percentage}% del premio</p>
                  <p className={`mt-2 text-xl font-semibold ${getPodiumStyle(3).amount}`}>{formatCurrency(thirdPlace.prizeAmount)}</p>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="panel overflow-hidden rounded-3xl">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tabla de posiciones</h3>
            <p className="text-sm text-muted-foreground">Ranking general de todos los participantes</p>
          </div>
          {typeof prizePool === "number" && (
            <div className="rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
              Premio: {formatCurrency(prizePool)}
            </div>
          )}
        </div>
        <div className="grid gap-4 p-4 md:hidden">
          {entries.map((entry) => (
            <article key={entry.userId} className="panel-muted rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex min-w-12 justify-center rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-foreground">
                    #{entry.rank}
                  </span>
                  <h4 className="mt-3 truncate text-base font-semibold text-foreground">{entry.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Puntos</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{entry.totalPoints}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground" title="Puntos obtenidos de pronósticos de partidos">Pts. Partidos</p>
                  <p className="mt-1 font-semibold text-foreground">{entry.matchPoints}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground" title="Puntos obtenidos de pronósticos anticipados">Pts. Anticipados</p>
                  <p className="mt-1 font-semibold text-foreground">{entry.anticipationPoints}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Exactos</p>
                  <p className="mt-1 font-semibold text-foreground">{entry.exactHits}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ganadores</p>
                  <p className="mt-1 font-semibold text-foreground">{entry.winnerHits}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                Empates acertados: <span className="font-semibold text-foreground">{entry.drawHits}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Pos.</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Participante</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Puntos</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]" title="Puntos obtenidos de pronósticos de partidos">Pts. Partidos</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]" title="Puntos obtenidos de pronósticos anticipados">Pts. Anticipados</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Exactos</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Ganadores</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Empates</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.userId} className="border-t border-border transition-colors hover:bg-muted/70">
                  <td className="px-5 py-4">
                    <span className="inline-flex min-w-12 justify-center rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground">
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-foreground">{entry.name}</td>
                  <td className="px-5 py-4 text-base font-semibold text-primary">{entry.totalPoints}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.matchPoints}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.anticipationPoints}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.exactHits}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.winnerHits}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.drawHits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
