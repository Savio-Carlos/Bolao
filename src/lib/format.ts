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

// Janela em que um jogo "deveria" estar rolando: já começou e ainda não foi
// encerrado. Serve só para manter a home se atualizando sozinha (LiveRefresh)
// durante o jogo, inclusive nos minutos entre o apito inicial e o sync marcar
// o status ao vivo. 3h cobre prorrogação + pênaltis com folga.
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function inLiveWindow(m: { status: string; kickoff: Date }): boolean {
  if (m.status === "FINISHED") return false;
  const k = m.kickoff.getTime();
  const now = Date.now();
  return k <= now && now < k + LIVE_WINDOW_MS;
}
