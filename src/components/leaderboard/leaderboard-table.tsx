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

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  prizePool?: number;
}

export function LeaderboardTable({ entries, prizePool }: LeaderboardTableProps) {
  return (
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
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Partidos</p>
                <p className="mt-1 font-semibold text-foreground">{entry.matchPoints}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Anticipados</p>
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
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Partidos</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Anticipados</th>
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
  );
}
