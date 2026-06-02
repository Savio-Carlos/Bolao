import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const me = await getCurrentUser();

  const [users, predictions] = await Promise.all([
    prisma.user.findMany({ orderBy: { username: "asc" } }),
    prisma.prediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
  ]);

  const stats = new Map<
    number,
    { total: number; exact: number; partial: number }
  >();
  for (const u of users) stats.set(u.id, { total: 0, exact: 0, partial: 0 });
  for (const p of predictions) {
    const s = stats.get(p.userId);
    if (!s) continue;
    s.total += p.points ?? 0;
    if (p.points === 10) s.exact++;
    else if (p.points === 5) s.partial++;
  }

  const rows = users
    .map((u) => ({ user: u, ...stats.get(u.id)! }))
    .sort((a, b) => b.total - a.total || b.exact - a.exact);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Ranking</h1>
      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-neutral-500 dark:bg-neutral-800">
            <tr>
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Jogador</th>
              <th className="px-3 py-2 text-center">Exatos</th>
              <th className="px-3 py-2 text-center">Parciais</th>
              <th className="px-3 py-2 text-right">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.user.id}
                className={`border-t border-black/5 dark:border-white/5 ${
                  me?.id === r.user.id ? "bg-green-50 dark:bg-green-950/30" : ""
                }`}
              >
                <td className="px-3 py-2 font-semibold text-neutral-500">
                  {i + 1}
                </td>
                <td className="px-3 py-2 font-medium">{r.user.username}</td>
                <td className="px-3 py-2 text-center tabular-nums">{r.exact}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {r.partial}
                </td>
                <td className="px-3 py-2 text-right text-lg font-bold tabular-nums">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">
        10 pontos por placar exato · 5 por acertar o vencedor/empate.
      </p>
    </div>
  );
}
