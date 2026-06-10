/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/matches/match-card";
import { DetailModal } from "@/components/ui/detail-modal";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, formatMatchDate } from "@/lib/utils";

function getMatchBreakdown(match: any, scoring: any) {
  if (match.homeScore == null || match.awayScore == null) {
    return {
      title: "Pendiente de calificar",
      points: match.prediction?.pointsAwarded ?? 0,
      explanation: "Este partido aun no tiene resultado oficial cargado.",
    };
  }

  const predictedHomeScore = match.prediction?.predictedHomeScore ?? 0;
  const predictedAwayScore = match.prediction?.predictedAwayScore ?? 0;
  const predictedDraw = predictedHomeScore === predictedAwayScore;
  const realDraw = match.homeScore === match.awayScore;
  const exact = predictedHomeScore === match.homeScore && predictedAwayScore === match.awayScore;

  if (exact) {
    return {
      title: "Marcador exacto",
      points: scoring.exactScorePoints + (realDraw ? scoring.drawPoints : scoring.winnerPoints),
      explanation: `Acertaste el marcador exacto, por eso sumaste ${scoring.exactScorePoints} pts base y ${realDraw ? scoring.drawPoints : scoring.winnerPoints} pts adicionales por el resultado correcto.`,
    };
  }

  if (predictedDraw && realDraw) {
    return {
      title: "Empate correcto",
      points: scoring.drawPoints,
      explanation: `No acertaste el marcador exacto, pero si que el partido terminaba empatado, asi que sumaste ${scoring.drawPoints} pts.`,
    };
  }

  const predictedWinner = predictedHomeScore > predictedAwayScore ? "home" : "away";
  const realWinner = match.homeScore > match.awayScore ? "home" : "away";

  if (!predictedDraw && !realDraw && predictedWinner === realWinner) {
    return {
      title: "Ganador correcto",
      points: scoring.winnerPoints,
      explanation: `No acertaste el marcador exacto, pero si elegiste al ganador correcto, asi que sumaste ${scoring.winnerPoints} pts.`,
    };
  }

  return {
    title: "Sin puntos",
    points: scoring.lossPoints,
    explanation: `Tu pronostico no coincidio ni con el marcador exacto ni con el resultado general del partido, por eso sumaste ${scoring.lossPoints} pts.`,
  };
}

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [anticipationOpen, setAnticipationOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["participant-predictions"],
    queryFn: () => apiFetch<any[]>("/api/participant/predictions"),
  });
  const { data: settingsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => apiFetch<any>("/api/settings/public"),
  });
  const { data: anticipationData } = useQuery({
    queryKey: ["participant-anticipation"],
    queryFn: () => apiFetch<any>("/api/participant/anticipation"),
  });
  const matchScoring = settingsData?.matchScoring;
  const selectedBreakdown = useMemo(
    () => (selectedMatch && matchScoring ? getMatchBreakdown(selectedMatch, matchScoring) : null),
    [selectedMatch, matchScoring],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tus jugadas"
        title="Mis pronosticos"
        description="Revisa cada marcador enviado, los resultados oficiales y los puntos obtenidos por partido."
      />

      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando pronosticos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}

      {anticipationData?.prediction ? (
        <div className="panel rounded-3xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pronostico anticipado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa cuanto llevas sumado por clasificados, mejores terceros, octavos y campeon.
              </p>
            </div>
            <button type="button" onClick={() => setAnticipationOpen(true)} className="btn-secondary">
              Ver detalle
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="panel-muted rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estado</p>
              <p className="mt-2 font-semibold text-foreground">{anticipationData.locked ? "Bloqueado" : "Editable"}</p>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ultima actualizacion</p>
              <p className="mt-2 font-semibold text-foreground">
                {anticipationData.prediction?.savedAt ? formatMatchDate(anticipationData.prediction.savedAt) : "Sin guardar"}
              </p>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Puntos actuales</p>
              <p className="mt-2 font-semibold text-foreground">{anticipationData.breakdown?.totalPoints ?? 0}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5">
        {(data ?? []).map((match) => (
          <div key={match._id} className="space-y-3">
            <MatchCard match={match} readOnly />
            <div className="flex justify-end">
              <button type="button" onClick={() => setSelectedMatch(match)} className="btn-secondary">
                Ver detalle de puntos
              </button>
            </div>
          </div>
        ))}
      </div>

      <DetailModal
        open={Boolean(selectedMatch && selectedBreakdown)}
        onClose={() => setSelectedMatch(null)}
        title="Detalle del pronostico por partido"
        description="Compara tu marcador con el resultado oficial y mira exactamente por que recibiste esos puntos."
      >
        {selectedMatch && selectedBreakdown ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Partido</p>
                <p className="mt-2 font-semibold text-foreground">
                  {selectedMatch.homeTeam.shortName} vs {selectedMatch.awayTeam.shortName}
                </p>
              </div>
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tu pronostico</p>
                <p className="mt-2 font-semibold text-foreground">
                  {selectedMatch.prediction.predictedHomeScore} - {selectedMatch.prediction.predictedAwayScore}
                </p>
              </div>
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resultado oficial</p>
                <p className="mt-2 font-semibold text-foreground">
                  {selectedMatch.homeScore ?? "-"} - {selectedMatch.awayScore ?? "-"}
                </p>
              </div>
            </div>
            <div className="panel-muted rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-foreground">{selectedBreakdown.title}</p>
                <span className="text-lg font-semibold text-primary">{selectedBreakdown.points} pts</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedBreakdown.explanation}</p>
            </div>
          </div>
        ) : null}
      </DetailModal>

      <DetailModal
        open={anticipationOpen}
        onClose={() => setAnticipationOpen(false)}
        title="Detalle de tus anticipados"
        description="Aqui se ve por que ya sumaste puntos en anticipados y que selecciones siguen pendientes."
      >
        {anticipationData?.breakdown ? (
          <div className="space-y-4">
            <div className="panel-muted rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Puntos actuales</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{anticipationData.breakdown.totalPoints} pts</p>
            </div>

            {anticipationData.breakdown.groupDetails.map((group: any) => (
              <div key={`detail-group-${group.group}`} className="panel-muted rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">Grupo {group.group}</p>
                  <span className="font-semibold text-primary">{group.pointsAwarded} pts</span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.selections.map((selection: any) => (
                    <div key={`${group.group}-${selection.slot}`} className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">
                      {selection.slot}: {selection.team ? selection.team.name : "Sin seleccionar"} {selection.hit ? `| +${anticipationData.settings.anticipationScoring.groupQualifiedPoints}` : "| 0"}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {[
              anticipationData.breakdown.bestThird,
              anticipationData.breakdown.roundOf16,
              anticipationData.breakdown.quarterFinal,
              anticipationData.breakdown.semiFinal,
              anticipationData.breakdown.final,
            ].map((section: any) => (
              <div key={`anticipation-${section.label}`} className="panel-muted rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{section.label}</p>
                  <span className="font-semibold text-primary">{section.pointsAwarded} pts</span>
                </div>
                <div className="mt-3 space-y-2">
                  {section.selections.length ? (
                    section.selections.map((item: any) => (
                      <div key={`${section.label}-${item.team._id}`} className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">
                        {item.team.name} {item.hit ? `| +${section.pointsPerHit}` : "| 0"}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">Sin selecciones en este bloque.</div>
                  )}
                </div>
              </div>
            ))}

            <div className="panel-muted rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">Campeon</p>
                <span className="font-semibold text-primary">{anticipationData.breakdown.champion.pointsAwarded} pts</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-card px-4 py-3">
                  Tu eleccion: {anticipationData.breakdown.champion.selection ? anticipationData.breakdown.champion.selection.name : "Sin seleccionar"}
                </div>
                <div className="rounded-2xl bg-card px-4 py-3">
                  Oficial: {anticipationData.breakdown.champion.official ? anticipationData.breakdown.champion.official.name : "Aun sin definir"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Aun no tienes un detalle disponible de anticipados.</div>
        )}
      </DetailModal>
    </div>
  );
}
