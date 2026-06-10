"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, formatMatchDate, formatMatchStage, formatMatchStatus } from "@/lib/utils";

interface MatchCardProps {
  match: {
    _id: string;
    stage: string;
    group?: string | null;
    stadium: string;
    matchDate: string;
    status: string;
    isClosed?: boolean;
    homeScore?: number | null;
    awayScore?: number | null;
    prediction?: {
      predictedHomeScore: number;
      predictedAwayScore: number;
      pointsAwarded?: number | null;
    } | null;
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
  };
  readOnly?: boolean;
}

export function MatchCard({ match, readOnly = false }: MatchCardProps) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({
    home: match.prediction?.predictedHomeScore?.toString() ?? "",
    away: match.prediction?.predictedAwayScore?.toString() ?? "",
  });

  const isLocked = Boolean(match.isClosed) || readOnly;

  const mutation = useMutation({
    mutationFn: async () =>
      apiFetch("/api/participant/predictions", {
        method: "POST",
        body: JSON.stringify({
          matchId: match._id,
          predictedHomeScore: Number(scores.home),
          predictedAwayScore: Number(scores.away),
        }),
      }),
    onSuccess: () => {
      toast.success(match.prediction ? "Pronostico actualizado correctamente" : "Pronostico guardado correctamente");
      queryClient.invalidateQueries({ queryKey: ["participant-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["participant-matches"] });
      queryClient.invalidateQueries({ queryKey: ["participant-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-primary">{formatMatchStage(match.stage)}</span>
        {match.group ? <span className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">Grupo {match.group}</span> : null}
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{formatMatchStatus(match.status)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="panel-muted min-w-0 overflow-hidden rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Local</p>
          <div className="mt-3 flex min-w-0 flex-col items-start gap-3">
            {match.homeTeam.flagUrl ? (
              <Image
                src={match.homeTeam.flagUrl}
                alt={match.homeTeam.name}
                width={32}
                height={24}
                className="h-6 w-8 shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0 max-w-full overflow-hidden">
              <h3 className="max-w-full whitespace-normal break-words text-base leading-tight font-semibold tracking-[-0.03em] text-foreground sm:text-lg lg:text-xl">
                {match.homeTeam.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{match.homeTeam.shortName}</p>
            </div>
          </div>
        </div>
        <div className="text-center text-xl font-semibold tracking-[0.3em] text-primary">VS</div>
        <div className="panel-muted min-w-0 overflow-hidden rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visitante</p>
          <div className="mt-3 flex min-w-0 flex-col items-start gap-3">
            {match.awayTeam.flagUrl ? (
              <Image
                src={match.awayTeam.flagUrl}
                alt={match.awayTeam.name}
                width={32}
                height={24}
                className="h-6 w-8 shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0 max-w-full overflow-hidden">
              <h3 className="max-w-full whitespace-normal break-words text-base leading-tight font-semibold tracking-[-0.03em] text-foreground sm:text-lg lg:text-xl">
                {match.awayTeam.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{match.awayTeam.shortName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          {formatMatchDate(match.matchDate)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          {match.stadium}
        </div>
      </div>

      {match.homeScore != null && match.awayScore != null && (
        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-primary">Resultado oficial:</span>
            {match.homeTeam.flagUrl ? (
              <Image
                src={match.homeTeam.flagUrl}
                alt={match.homeTeam.name}
                width={20}
                height={15}
                className="h-[15px] w-5 object-contain"
              />
            ) : null}
            <span>
              {match.homeTeam.shortName} {match.homeScore}
            </span>
            <span>-</span>
            <span>
              {match.awayScore} {match.awayTeam.shortName}
            </span>
            {match.awayTeam.flagUrl ? (
              <Image
                src={match.awayTeam.flagUrl}
                alt={match.awayTeam.name}
                width={20}
                height={15}
                className="h-[15px] w-5 object-contain"
              />
            ) : null}
          </div>
          {typeof match.prediction?.pointsAwarded === "number" ? (
            <span className="mt-2 inline-block font-semibold text-primary">Puntos: {match.prediction.pointsAwarded}</span>
          ) : (
            ""
          )}
        </div>
      )}

      <div className="panel-muted mt-5 rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
          <Shield className="size-4 text-primary" /> Tu pronóstico
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
          <input
            type="number"
            min={0}
            value={scores.home}
            onChange={(event) => setScores((current) => ({ ...current, home: event.target.value }))}
            disabled={isLocked}
            className="field-input"
            placeholder="0"
          />
          <span className="text-center text-muted-foreground">-</span>
          <input
            type="number"
            min={0}
            value={scores.away}
            onChange={(event) => setScores((current) => ({ ...current, away: event.target.value }))}
            disabled={isLocked}
            className="field-input"
            placeholder="0"
          />
          <button
            type="button"
            disabled={isLocked || mutation.isPending || scores.home === "" || scores.away === ""}
            onClick={() => mutation.mutate()}
            className="btn-primary min-w-32"
          >
            {mutation.isPending ? "Guardando..." : match.prediction ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Puedes editar tu pronostico hasta 15 minutos antes de que inicie el partido. Despues de ese cierre ya no se puede modificar.
        </p>
      </div>
    </div>
  );
}
