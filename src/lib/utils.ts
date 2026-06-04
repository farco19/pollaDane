import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export { formatMatchDate } from "@/lib/match-datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

const matchStageLabels: Record<string, string> = {
  group: "Fase de grupos",
  round_of_32: "16vos de final",
  round_of_16: "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

const matchStatusLabels: Record<string, string> = {
  scheduled: "Programado",
  live: "En juego",
  finished: "Finalizado",
};

export function formatMatchStage(stage: string) {
  return matchStageLabels[stage] ?? stage;
}

export function formatMatchStatus(status: string) {
  return matchStatusLabels[status] ?? status;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Ocurrio un error en la solicitud");
  }

  return payload.data as T;
}

export function createCode(prefix: string, index: number) {
  return `${prefix}-${String(index).padStart(3, "0")}`.toUpperCase();
}
