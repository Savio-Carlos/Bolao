// Formato normalizado de um jogo, independente da fonte de dados (football-data
// ou openfootball). É isto que o sync grava no banco.
export interface NormalizedMatch {
  externalId: number;
  stage: string;
  group: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoff: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: "HOME" | "AWAY" | "DRAW" | null;
}

// Ordem das fases para exibição no cronograma.
export const STAGE_ORDER: string[] = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

export const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LAST_32: "16-avos de final",
  LAST_16: "Oitavas de final",
  QUARTER_FINALS: "Quartas de final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "Disputa de 3º lugar",
  FINAL: "Final",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function stageRank(stage: string): number {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? STAGE_ORDER.length : i;
}

export function groupLabel(group: string | null): string | null {
  if (!group) return null;
  // "GROUP_A" -> "Grupo A"
  const letter = group.replace("GROUP_", "");
  return `Grupo ${letter}`;
}

// Um jogo está aberto para palpites enquanto não começou e os dois times existem.
export function isOpenForPrediction(match: {
  kickoff: Date;
  homeTeam: string | null;
  awayTeam: string | null;
}): boolean {
  return (
    !!match.homeTeam &&
    !!match.awayTeam &&
    match.kickoff.getTime() > Date.now()
  );
}

// Pontuação clássica do bolão: 10 placar exato, 5 acertar o vencedor/empate, 0 senão.
export function computePoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
): number {
  if (predHome === realHome && predAway === realAway) return 10;
  const predDir = Math.sign(predHome - predAway);
  const realDir = Math.sign(realHome - realAway);
  return predDir === realDir ? 5 : 0;
}
