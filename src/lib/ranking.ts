// Ranking geral do bolão: soma os pontos dos palpites (placar exato = 10, vencedor = 5)
// com o bônus dos palpites da Copa, e ordena. Usado na página de Ranking e na home.

export interface RankingRow<U extends { id: number }> {
  user: U;
  total: number;
  bonus: number;
  exact: number; // placares cravados (10 pts)
  partial: number; // acertou vencedor/empate (5 pts)
}

export function computeRanking<U extends { id: number }>(
  users: U[],
  predictions: { userId: number; points: number | null }[],
  tournamentBets: { userId: number; points: number | null }[],
): RankingRow<U>[] {
  const stats = new Map<
    number,
    { total: number; bonus: number; exact: number; partial: number }
  >();
  for (const u of users)
    stats.set(u.id, { total: 0, bonus: 0, exact: 0, partial: 0 });

  for (const p of predictions) {
    const s = stats.get(p.userId);
    if (!s) continue;
    s.total += p.points ?? 0;
    if (p.points === 10) s.exact++;
    else if (p.points === 5) s.partial++;
  }
  for (const b of tournamentBets) {
    const s = stats.get(b.userId);
    if (!s) continue;
    s.bonus += b.points ?? 0;
    s.total += b.points ?? 0;
  }

  return users
    .map((u) => ({ user: u, ...stats.get(u.id)! }))
    .sort((a, b) => b.total - a.total || b.exact - a.exact);
}
