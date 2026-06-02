import type { NormalizedMatch } from "./types";

const FOOTBALL_DATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";
const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

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

// Ponto de entrada: escolhe a fonte conforme a presença da chave da API.
export async function fetchMatches(): Promise<NormalizedMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (apiKey && apiKey.trim()) {
    return fetchFromFootballData(apiKey.trim());
  }
  return fetchFromOpenFootball();
}
