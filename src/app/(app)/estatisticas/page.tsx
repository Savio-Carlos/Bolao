import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
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
  unit,
  who,
  corner,
  variant = "hot",
}: {
  emoji: string;
  title: string;
  value: string;
  unit?: string;
  who?: string;
  corner: string;
  variant?: "hot" | "cold";
}) {
  return (
    <div className={`statcard ${variant}`}>
      <div className="badge">{emoji}</div>
      <div>
        <p className="st-label">{title}</p>
        <p className="st-value">
          {value}
          {unit && <small> {unit}</small>}
        </p>
        {who && (
          <p
            className="st-who"
            style={variant === "cold" ? { color: "var(--red)" } : undefined}
          >
            {who}
          </p>
        )}
      </div>
      <span className="corner">{corner}</span>
    </div>
  );
}

export default async function EstatisticasPage() {
  const me = await getCurrentUser();
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
      <>
        <header className="page-head">
          <p className="kicker">★ Os recordes do bolão</p>
          <h1>
            As <em>Estatísticas</em>
          </h1>
          <div className="page-rule" />
        </header>
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            As estatísticas aparecem aqui assim que os primeiros jogos forem
            encerrados. 🍿
          </p>
        </div>
      </>
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
    <>
      <header className="page-head">
        <p className="kicker">★ Os recordes do bolão</p>
        <h1>
          As <em>Estatísticas</em>
        </h1>
        <p className="sub">
          Quem está quente, quem está gelado, e quem manda em cada fase do
          mundial. <b>Acerto</b> = palpite que pontuou · <b>Erro</b> = palpite
          que zerou.
        </p>
        <div className="page-rule" />
      </header>

      <section className="stat-grid">
        <StatCard
          emoji="🔥"
          variant="hot"
          corner="EM ALTA"
          title="Maior sequência de acertos"
          value={bestHit.value > 0 ? String(bestHit.value) : "—"}
          unit={bestHit.value > 0 ? "seguidos" : undefined}
          who={bestHit.value > 0 ? fmtNames(bestHit.names) : undefined}
        />
        <StatCard
          emoji="🧊"
          variant="cold"
          corner="GELADO"
          title="Maior sequência de erros"
          value={bestMiss.value > 0 ? String(bestMiss.value) : "—"}
          unit={bestMiss.value > 0 ? "seguidos" : undefined}
          who={bestMiss.value > 0 ? fmtNames(bestMiss.names) : undefined}
        />
        <StatCard
          emoji="🎯"
          variant="hot"
          corner="PONTARIA"
          title="Mais placares cravados"
          value={mostExact.value > 0 ? String(mostExact.value) : "—"}
          unit={mostExact.value > 0 ? "placares" : undefined}
          who={mostExact.value > 0 ? fmtNames(mostExact.names) : undefined}
        />
        <StatCard
          emoji="🥶"
          variant="cold"
          corner="AZAR"
          title="Pé frio · menor aproveitamento"
          value={peFrio ? `${Math.round(peFrio.rate * 100)}` : "—"}
          unit={peFrio ? "%" : undefined}
          who={
            peFrio ? peFrio.name : `exige ${MIN_PE_FRIO}+ palpites encerrados`
          }
        />
      </section>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Ranking por fase
        </h2>
        <span className="bar" />
        <span className="daytag">Pontos na fase</span>
      </div>

      <section className="fase-grid">
        {stagesPresent.map((stage) => {
          const ranking = [...byStage.get(stage)!.entries()]
            .map(([userId, points]) => ({
              userId,
              username: byUser.get(userId)!.username,
              points,
            }))
            .sort(
              (a, b) =>
                b.points - a.points ||
                a.username.localeCompare(b.username, "pt-BR"),
            );
          return (
            <div className="fasecard" key={stage}>
              <h3>
                <span>{stageLabel(stage)}</span>
                <span className="ph">{ranking.length} jogadores</span>
              </h3>
              <table className="fasetable">
                <tbody>
                  {ranking.map((r, i) => (
                    <tr
                      key={r.userId}
                      className={me?.id === r.userId ? "me" : ""}
                    >
                      <td className="pos">{i + 1}</td>
                      <td className="nm">{r.username}</td>
                      <td className="pt">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>
    </>
  );
}
