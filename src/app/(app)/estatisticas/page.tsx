import { prisma } from "@/lib/db";
import { stageLabel, stageRank } from "@/lib/football/types";

export const dynamic = "force-dynamic";

// Mínimo de palpites encerrados para concorrer a "pé frio" (evita amostra de 1 jogo).
const MIN_PE_FRIO = 5;

interface UserStat {
  username: string;
  hits: number; // palpites que pontuaram (acertou ao menos o vencedor)
  total: number;
  exact: number; // placares cravados
  bestHit: number; // maior sequência de acertos
  bestMiss: number; // maior sequência de erros
  curHit: number;
  curMiss: number;
}

function StatCard({
  emoji,
  title,
  value,
  subtitle,
}: {
  emoji: string;
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <span className="text-sm text-neutral-500">
        {emoji} {title}
      </span>
      <span className="text-lg font-bold">{value}</span>
      {subtitle && <span className="text-xs text-neutral-400">{subtitle}</span>}
    </div>
  );
}

export default async function EstatisticasPage() {
  const preds = await prisma.prediction.findMany({
    where: { points: { not: null } },
    include: {
      match: { select: { stage: true } },
      user: { select: { id: true, username: true } },
    },
    orderBy: { match: { kickoff: "asc" } },
  });

  if (preds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Estatísticas</h1>
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-neutral-500 dark:border-white/15">
          As estatísticas aparecem aqui assim que os primeiros jogos forem
          encerrados. 🍿
        </div>
      </div>
    );
  }

  // Acumula por usuário (na ordem cronológica, para as sequências).
  const byUser = new Map<number, UserStat>();
  // Pontos por fase: stage -> (userId -> pontos).
  const byStage = new Map<string, Map<number, number>>();

  for (const p of preds) {
    let s = byUser.get(p.user.id);
    if (!s) {
      s = {
        username: p.user.username,
        hits: 0,
        total: 0,
        exact: 0,
        bestHit: 0,
        bestMiss: 0,
        curHit: 0,
        curMiss: 0,
      };
      byUser.set(p.user.id, s);
    }
    const pts = p.points ?? 0;
    const hit = pts > 0;
    s.total++;
    if (hit) {
      s.hits++;
      if (pts === 10) s.exact++;
      s.curHit++;
      s.curMiss = 0;
      s.bestHit = Math.max(s.bestHit, s.curHit);
    } else {
      s.curMiss++;
      s.curHit = 0;
      s.bestMiss = Math.max(s.bestMiss, s.curMiss);
    }

    const stage = p.match.stage;
    if (!byStage.has(stage)) byStage.set(stage, new Map());
    const sm = byStage.get(stage)!;
    sm.set(p.user.id, (sm.get(p.user.id) ?? 0) + pts);
  }

  const stats = [...byUser.values()];

  // Helpers de "campeão" de cada estatística (lida com empates).
  function leadersBy(
    pick: (s: UserStat) => number,
    eligible: (s: UserStat) => boolean = () => true,
  ): { value: number; names: string[] } {
    const pool = stats.filter(eligible);
    if (pool.length === 0) return { value: 0, names: [] };
    const value = Math.max(...pool.map(pick));
    const names = pool.filter((s) => pick(s) === value).map((s) => s.username);
    return { value, names };
  }

  const bestHit = leadersBy((s) => s.bestHit);
  const bestMiss = leadersBy((s) => s.bestMiss);
  const mostExact = leadersBy((s) => s.exact);

  // Pé frio: menor aproveitamento entre quem tem amostra suficiente.
  const eligiblePeFrio = stats.filter((s) => s.total >= MIN_PE_FRIO);
  let peFrio: { name: string; rate: number } | null = null;
  if (eligiblePeFrio.length > 0) {
    const worst = eligiblePeFrio.reduce((a, b) =>
      a.hits / a.total <= b.hits / b.total ? a : b,
    );
    peFrio = { name: worst.username, rate: worst.hits / worst.total };
  }

  const fmtNames = (names: string[]) =>
    names.length === 0 ? "—" : names.join(", ");

  const stagesPresent = [...byStage.keys()].sort(
    (a, b) => stageRank(a) - stageRank(b),
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Estatísticas</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          emoji="🔥"
          title="Maior sequência de acertos"
          value={bestHit.value > 0 ? `${bestHit.value} seguidos` : "—"}
          subtitle={bestHit.value > 0 ? fmtNames(bestHit.names) : undefined}
        />
        <StatCard
          emoji="🧊"
          title="Maior sequência de erros"
          value={bestMiss.value > 0 ? `${bestMiss.value} seguidos` : "—"}
          subtitle={bestMiss.value > 0 ? fmtNames(bestMiss.names) : undefined}
        />
        <StatCard
          emoji="🎯"
          title="Mais placares cravados"
          value={mostExact.value > 0 ? `${mostExact.value} placares` : "—"}
          subtitle={mostExact.value > 0 ? fmtNames(mostExact.names) : undefined}
        />
        <StatCard
          emoji="🥶"
          title="Pé frio (menor aproveitamento)"
          value={peFrio ? `${Math.round(peFrio.rate * 100)}%` : "—"}
          subtitle={
            peFrio
              ? peFrio.name
              : `aparece com ${MIN_PE_FRIO}+ palpites encerrados`
          }
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Ranking por fase</h2>
        {stagesPresent.map((stage) => {
          const ranking = [...byStage.get(stage)!.entries()]
            .map(([userId, points]) => ({
              username: byUser.get(userId)!.username,
              points,
            }))
            .sort(
              (a, b) =>
                b.points - a.points ||
                a.username.localeCompare(b.username, "pt-BR"),
            );
          return (
            <div key={stage} className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-neutral-500">
                {stageLabel(stage)}
              </h3>
              <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full text-sm">
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr
                        key={r.username}
                        className="border-t border-black/5 first:border-t-0 dark:border-white/5"
                      >
                        <td className="px-3 py-1.5 w-8 font-semibold text-neutral-500">
                          {i + 1}
                        </td>
                        <td className="px-3 py-1.5 font-medium">
                          {r.username}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold tabular-nums">
                          {r.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-xs text-neutral-400">
        &ldquo;Acerto&rdquo; = palpite que pontuou (cravou o placar ou acertou o
        vencedor). &ldquo;Erro&rdquo; = palpite que zerou.
      </p>
    </div>
  );
}
