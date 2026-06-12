import type { NormalizedMatch } from "./types";

const FOOTBALL_DATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";
const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
// Placar/situação ao vivo (sem chave). Cobre toda a temporada de 2026 num request.
const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026&limit=400";

// ---- Fonte principal: football-data.org ------------------------------------

interface FdTeam {
  name: string | null;
  crest: string | null;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
}

function mapWinner(w: FdMatch["score"]["winner"]): NormalizedMatch["winner"] {
  if (w === "HOME_TEAM") return "HOME";
  if (w === "AWAY_TEAM") return "AWAY";
  if (w === "DRAW") return "DRAW";
  return null;
}

async function fetchFromFootballData(apiKey: string): Promise<NormalizedMatch[]> {
  const res = await fetch(FOOTBALL_DATA_URL, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `football-data.org respondeu ${res.status}: ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { matches: FdMatch[] };
  return data.matches.map((m) => ({
    externalId: m.id,
    stage: m.stage,
    group: m.group ?? null,
    homeTeam: m.homeTeam?.name ?? null,
    awayTeam: m.awayTeam?.name ?? null,
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    kickoff: new Date(m.utcDate),
    status: m.status,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    winner: mapWinner(m.score?.winner ?? null),
  }));
}

// ---- Fallback: openfootball/worldcup.json (sem chave) ----------------------
// Usado só se FOOTBALL_DATA_API_KEY não estiver setada. Formato best-effort.

interface OfMatch {
  num?: number;
  date?: string;
  time?: string;
  group?: string;
  round?: string;
  team1?: { name?: string } | string;
  team2?: { name?: string } | string;
  score?: { ft?: [number, number] };
}
interface OfData {
  rounds?: { name?: string; matches?: OfMatch[] }[];
  matches?: OfMatch[];
}

function ofTeamName(t: OfMatch["team1"]): string | null {
  if (!t) return null;
  const name = typeof t === "string" ? t : t.name ?? null;
  if (!name) return null;
  // No mata-mata o openfootball usa placeholders ("2A", "1E", "3A/B/C/D/F").
  // Tratamos como "a definir" para não abrir palpite antes de o time existir.
  if (/\d/.test(name) || name.includes("/")) return null;
  return name;
}

// "2026-06-11" + "13:00 UTC-6" -> Date em UTC. Lida com sufixo de fuso opcional.
function parseKickoff(date?: string, time?: string): Date {
  const d = date ?? "2026-06-11";
  const t = time ?? "12:00";
  const m = t.match(/(\d{1,2}):(\d{2})(?:\s*UTC\s*([+-]?\d{1,2}))?/i);
  if (!m) return new Date(`${d}T12:00:00Z`);
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const offset = m[3] ? Number(m[3]) : 0;
  // Hora local = hh:mm no fuso `offset`. UTC = local - offset.
  const base = new Date(
    `${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`,
  );
  base.setUTCHours(base.getUTCHours() - offset);
  return base;
}

function ofStage(m: OfMatch): string {
  if (m.group) return "GROUP_STAGE";
  const r = (m.round ?? "").toLowerCase();
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter"))
    return "FINAL";
  if (r.includes("third")) return "THIRD_PLACE";
  if (r.includes("semi")) return "SEMI_FINALS";
  if (r.includes("quarter")) return "QUARTER_FINALS";
  if (r.includes("16")) return "LAST_16";
  if (r.includes("32")) return "LAST_32";
  return "GROUP_STAGE";
}

async function fetchFromOpenFootball(): Promise<NormalizedMatch[]> {
  const res = await fetch(OPENFOOTBALL_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`openfootball respondeu ${res.status}`);
  }
  const data = (await res.json()) as OfData;
  const raw: OfMatch[] = data.rounds
    ? data.rounds.flatMap((r) =>
        (r.matches ?? []).map((m) => ({ ...m, round: m.round ?? r.name })),
      )
    : data.matches ?? [];

  return raw.map((m, i) => {
    const ft = m.score?.ft;
    const hasScore = Array.isArray(ft) && ft.length === 2;
    const home = hasScore ? ft![0] : null;
    const away = hasScore ? ft![1] : null;
    const kickoff = parseKickoff(m.date, m.time);
    return {
      externalId: m.num ?? i + 1,
      stage: ofStage(m),
      group: m.group ? `GROUP_${m.group.replace(/group\s*/i, "").trim()}` : null,
      homeTeam: ofTeamName(m.team1),
      awayTeam: ofTeamName(m.team2),
      homeCrest: null,
      awayCrest: null,
      kickoff,
      status: hasScore ? "FINISHED" : "SCHEDULED",
      homeScore: home,
      awayScore: away,
      winner:
        home === null || away === null
          ? null
          : home > away
            ? "HOME"
            : away > home
              ? "AWAY"
              : "DRAW",
    };
  });
}

// ---- Overlay ao vivo: ESPN -------------------------------------------------
// A football-data.org no plano grátis demora (às vezes horas) para marcar
// IN_PLAY/FINISHED e nunca manda placar ao vivo. A API pública da ESPN (sem
// chave) traz a situação em tempo real. Mantemos a fonte base como dona da
// ESTRUTURA (times, escudos, fase, grupo, horário) e só sobrepomos status,
// placar e vencedor vindos da ESPN. Se a ESPN falhar, fica a base.

interface EspnStatusType {
  state?: "pre" | "in" | "post";
  name?: string;
  completed?: boolean;
}
interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: { displayName?: string };
}
interface EspnEvent {
  date: string;
  status?: { type?: EspnStatusType };
  competitions?: {
    competitors?: EspnCompetitor[];
    status?: { type?: EspnStatusType };
  }[];
}

interface EspnOverlay {
  minute: string; // "YYYY-MM-DDTHH:MM" em UTC — chave principal de casamento
  homeNorm: string;
  awayNorm: string;
  status: string | null; // null quando ainda "pre" (não sobrepõe a base)
  homeScore: number | null;
  awayScore: number | null;
  winner: NormalizedMatch["winner"];
}

// Normaliza nome de seleção p/ comparar entre fontes ("Türkiye"->"turkiye").
function normTeam(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos/diacríticos
    .replace(/[^a-z0-9]/g, "");
}

function mapEspnStatus(t: EspnStatusType | undefined): string | null {
  const state = t?.state;
  if (state === "in") {
    // Intervalo também conta como "ao vivo" para o app.
    return t?.name === "STATUS_HALFTIME" ? "PAUSED" : "IN_PLAY";
  }
  if (state === "post") {
    if (t?.completed) return "FINISHED";
    const n = t?.name ?? "";
    if (n.includes("POSTPONED")) return "POSTPONED";
    if (n.includes("CANCEL") || n.includes("ABANDONED")) return "CANCELLED";
    return "FINISHED";
  }
  return null; // "pre" ou desconhecido
}

function parseEspnScore(s: string | undefined): number | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function fetchEspnOverlays(): Promise<EspnOverlay[]> {
  const res = await fetch(ESPN_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`espn respondeu ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  const out: EspnOverlay[] = [];
  for (const e of data.events ?? []) {
    const c = e.competitions?.[0];
    if (!c) continue;
    const home = c.competitors?.find((x) => x.homeAway === "home");
    const away = c.competitors?.find((x) => x.homeAway === "away");
    const status = mapEspnStatus(c.status?.type ?? e.status?.type);
    const live = status !== null;
    const hs = live ? parseEspnScore(home?.score) : null;
    const as = live ? parseEspnScore(away?.score) : null;
    out.push({
      minute: e.date.slice(0, 16),
      homeNorm: normTeam(home?.team?.displayName),
      awayNorm: normTeam(away?.team?.displayName),
      status,
      homeScore: hs,
      awayScore: as,
      winner:
        status === "FINISHED" && hs !== null && as !== null
          ? hs > as
            ? "HOME"
            : as > hs
              ? "AWAY"
              : "DRAW"
          : null,
    });
  }
  return out;
}

// Casa cada jogo da base com o evento da ESPN (pelo horário de início; desempata
// por nome quando há jogos simultâneos) e sobrepõe status/placar/vencedor.
function applyEspnOverlay(base: NormalizedMatch[], overlays: EspnOverlay[]): void {
  const used = new Set<EspnOverlay>();
  const teamScore = (m: NormalizedMatch, o: EspnOverlay): number => {
    const h = normTeam(m.homeTeam);
    const a = normTeam(m.awayTeam);
    const hit = (x: string, y: string) =>
      x && y && (x === y || x.includes(y) || y.includes(x)) ? 1 : 0;
    return hit(h, o.homeNorm) + hit(a, o.awayNorm);
  };
  for (const m of base) {
    const minute = m.kickoff.toISOString().slice(0, 16);
    const sameMinute = overlays.filter((o) => !used.has(o) && o.minute === minute);
    let pick: EspnOverlay | null = null;
    if (sameMinute.length === 1) {
      pick = sameMinute[0];
    } else if (sameMinute.length > 1) {
      sameMinute.sort((x, y) => teamScore(m, y) - teamScore(m, x));
      pick = sameMinute[0];
    } else {
      // Horário não bateu: tenta pelo nome dentro do mesmo dia.
      const day = minute.slice(0, 10);
      const cands = overlays
        .filter((o) => !used.has(o) && o.minute.slice(0, 10) === day)
        .sort((x, y) => teamScore(m, y) - teamScore(m, x));
      if (cands[0] && teamScore(m, cands[0]) >= 1) pick = cands[0];
    }
    if (!pick) continue;
    used.add(pick);
    if (pick.status === null) continue; // ESPN ainda "pre": mantém a base
    m.status = pick.status;
    m.homeScore = pick.homeScore;
    m.awayScore = pick.awayScore;
    m.winner = pick.winner;
  }
}

// Ponto de entrada: estrutura vem da fonte base (football-data ou openfootball)
// e a situação ao vivo é sobreposta pela ESPN (best-effort).
export async function fetchMatches(): Promise<NormalizedMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const base =
    apiKey && apiKey.trim()
      ? await fetchFromFootballData(apiKey.trim())
      : await fetchFromOpenFootball();

  try {
    const overlays = await fetchEspnOverlays();
    applyEspnOverlay(base, overlays);
  } catch (err) {
    console.error("Overlay ESPN falhou (mantendo dados da fonte base):", err);
  }

  return base;
}
