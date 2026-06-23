import { prisma } from "@/lib/db";

// Categorias "simples" (um valor, acerto = igualdade tolerante).
export type SimpleKey = "champion" | "runnerUp" | "topScorer" | "bestPlayer";

export interface CategoryMeta {
  key: SimpleKey;
  label: string;
  // "team": campo com autocomplete da lista de seleções; "text": texto livre.
  type: "team" | "text";
  points: number;
}

export const SIMPLE_CATEGORIES: CategoryMeta[] = [
  { key: "champion", label: "Campeão", type: "team", points: 50 },
  { key: "runnerUp", label: "Vice-campeão", type: "team", points: 30 },
  { key: "topScorer", label: "Artilheiro", type: "text", points: 25 },
  { key: "bestPlayer", label: "Melhor jogador", type: "text", points: 15 },
];

// Maior zebra: aposta composta (seleção + fase em que ela é eliminada).
// Pontuação condicional: a fase só pontua se a seleção também estiver certa.
export const UPSET = {
  teamPoints: 10,
  stagePoints: 15,
  get totalPoints() {
    return this.teamPoints + this.stagePoints;
  },
};

// Fases possíveis de eliminação no mata-mata.
export const UPSET_STAGES: { value: string; label: string }[] = [
  { value: "LAST_32", label: "16-avos" },
  { value: "LAST_16", label: "Oitavas" },
  { value: "QUARTER_FINALS", label: "Quartas" },
  { value: "SEMI_FINALS", label: "Semifinal" },
  { value: "FINAL", label: "Final" },
];

export function upsetStageLabel(value: string | null): string {
  return UPSET_STAGES.find((s) => s.value === value)?.label ?? "";
}

// Todos os campos persistidos do palpite/gabarito.
export interface TournamentFields {
  champion: string | null;
  runnerUp: string | null;
  topScorer: string | null;
  bestPlayer: string | null;
  upsetTeam: string | null;
  upsetStage: string | null;
}

export const ALL_KEYS: (keyof TournamentFields)[] = [
  "champion",
  "runnerUp",
  "topScorer",
  "bestPlayer",
  "upsetTeam",
  "upsetStage",
];

// Comparação tolerante: ignora acentos, maiúsculas e espaços nas pontas.
export function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Soma os pontos das categorias acertadas. Categorias sem gabarito são ignoradas.
export function gradeTournamentBet(
  bet: TournamentFields,
  result: TournamentFields | null,
): number {
  if (!result) return 0;
  let total = 0;

  for (const cat of SIMPLE_CATEGORIES) {
    const official = normalize(result[cat.key]);
    if (official && normalize(bet[cat.key]) === official) {
      total += cat.points;
    }
  }

  // Maior zebra: acerta a seleção (+10) e, só então, a fase (+15).
  const officialTeam = normalize(result.upsetTeam);
  if (officialTeam && normalize(bet.upsetTeam) === officialTeam) {
    total += UPSET.teamPoints;
    const officialStage = normalize(result.upsetStage);
    if (officialStage && normalize(bet.upsetStage) === officialStage) {
      total += UPSET.stagePoints;
    }
  }

  return total;
}

// Os palpites do torneio travam no início do mata-mata (primeiro jogo fora da
// fase de grupos). Assim a galera tem a fase de grupos inteira pra preencher.
export async function tournamentDeadline(): Promise<Date | null> {
  const agg = await prisma.match.aggregate({
    where: { stage: { not: "GROUP_STAGE" } },
    _min: { kickoff: true },
  });
  return agg._min.kickoff ?? null;
}

export async function tournamentDeadlineOpen(): Promise<boolean> {
  const deadline = await tournamentDeadline();
  if (!deadline) return true; // mata-mata ainda não carregado
  return Date.now() < deadline.getTime();
}
