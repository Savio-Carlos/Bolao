// Calcula a classificação de cada grupo a partir dos jogos da fase de grupos.

export interface TeamRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // gols pró
  ga: number; // gols contra
  gd: number; // saldo
  points: number;
}

export interface GroupStanding {
  group: string;
  rows: TeamRow[];
}

interface MatchLike {
  group: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

function emptyRow(team: string): TeamRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

// Critérios de desempate (simplificados): pontos → saldo → gols pró → nome.
export function compareRows(a: TeamRow, b: TeamRow): number {
  return (
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.team.localeCompare(b.team, "pt-BR")
  );
}

export interface ThirdPlaceRow extends TeamRow {
  group: string; // "GROUP_A"
  qualifies: boolean; // entre os 8 melhores terceiros
}

// Ranqueia os terceiros colocados de todos os grupos entre si. Os 8 melhores
// avançam ao mata-mata. Mesmos critérios de desempate dos grupos.
export function computeThirdPlaceRanking(
  standings: GroupStanding[],
): ThirdPlaceRow[] {
  const thirds = standings
    .filter((s) => s.rows.length >= 3)
    .map((s) => ({ ...s.rows[2], group: s.group, qualifies: false }));
  thirds.sort(compareRows);
  thirds.forEach((t, i) => {
    t.qualifies = i < 8;
  });
  return thirds;
}

export function computeGroupStandings(matches: MatchLike[]): GroupStanding[] {
  // group -> (team -> row)
  const groups = new Map<string, Map<string, TeamRow>>();

  const ensure = (group: string, team: string) => {
    if (!groups.has(group)) groups.set(group, new Map());
    const g = groups.get(group)!;
    if (!g.has(team)) g.set(team, emptyRow(team));
    return g.get(team)!;
  };

  for (const m of matches) {
    if (!m.group || !m.homeTeam || !m.awayTeam) continue;
    // Registra as duas seleções (mesmo sem jogo disputado, para listar o grupo).
    const home = ensure(m.group, m.homeTeam);
    const away = ensure(m.group, m.awayTeam);

    const played =
      m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null;
    if (!played) continue;

    const hs = m.homeScore!;
    const as = m.awayScore!;
    home.played++;
    away.played++;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (hs > as) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hs < as) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  return [...groups.entries()]
    .map(([group, rows]) => ({
      group,
      rows: [...rows.values()].sort(compareRows),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
