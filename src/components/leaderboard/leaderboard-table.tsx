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
      <div className="overflow-x-auto">
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
