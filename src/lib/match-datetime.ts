const COLOMBIA_TIME_ZONE = "America/Bogota";
const COLOMBIA_OFFSET = "-05:00";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function pad(value: string | undefined) {
  return value ?? "00";
}

export function parseColombiaDateTimeLocal(value: string) {
  const match = value
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, datePart, timePart, seconds] = match;
  const parsed = new Date(`${datePart}T${timePart}:${pad(seconds)}${COLOMBIA_OFFSET}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMatchDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(toDate(value));
}

export function formatLongMatchDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(toDate(value));
}

export function getColombiaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(toDate(value));

  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}
