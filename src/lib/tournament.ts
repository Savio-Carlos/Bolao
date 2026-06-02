import { prisma } from "@/lib/db";

// Chaves das categorias de palpite do torneio.
export type TournamentKey =
  | "champion"
  | "runnerUp"
  | "topScorer"
  | "bestPlayer"
  | "surpriseTeam"
  | "biggestUpset";

export interface CategoryMeta {
  key: TournamentKey;
  label: string;
  // "team": campo com autocomplete da lista de seleções; "text": texto livre.
  type: "team" | "text";
  points: number;
}

// Fonte única de verdade: usada na UI, na pontuação e na correção.
export const TOURNAMENT_CATEGORIES: CategoryMeta[] = [
  { key: "champion", label: "Campeão", type: "team", points: 50 },
  { key: "runnerUp", label: "Vice-campeão", type: "team", points: 30 },
  { key: "topScorer", label: "Artilheiro", type: "text", points: 25 },
  { key: "bestPlayer", label: "Melhor jogador", type: "text", points: 25 },
  { key: "surpriseTeam", label: "Seleção surpresa", type: "team", points: 20 },
  { key: "biggestUpset", label: "Maior zebra", type: "text", points: 20 },
];

// Subconjunto dos campos de palpite (sem metadados do registro).
export type TournamentFields = Record<TournamentKey, string | null>;

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
  for (const cat of TOURNAMENT_CATEGORIES) {
    const official = normalize(result[cat.key]);
    if (official && normalize(bet[cat.key]) === official) {
      total += cat.points;
    }
  }
  return total;
}

// Os palpites do torneio travam no apito inicial do primeiro jogo da Copa.
export async function tournamentDeadlineOpen(): Promise<boolean> {
  const agg = await prisma.match.aggregate({ _min: { kickoff: true } });
  const first = agg._min.kickoff;
  if (!first) return true; // ainda não há jogos carregados
  return Date.now() < first.getTime();
}
