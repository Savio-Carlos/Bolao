const TZ = "America/Sao_Paulo";

export function formatDay(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  }).format(d);
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

// Chave de agrupamento por dia (no fuso de Brasília).
export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(d);
}

const LIVE = new Set(["IN_PLAY", "PAUSED"]);

export function statusLabel(status: string): string {
  if (status === "FINISHED") return "Encerrado";
  if (LIVE.has(status)) return "Ao vivo";
  if (status === "POSTPONED") return "Adiado";
  if (status === "SUSPENDED") return "Suspenso";
  if (status === "CANCELLED") return "Cancelado";
  return "Agendado";
}

export function isLive(status: string): boolean {
  return LIVE.has(status);
}
