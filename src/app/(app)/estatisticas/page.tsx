import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { dayKey } from "@/lib/format";
import { stageLabel, stageRank } from "@/lib/football/types";
import { computeRanking } from "@/lib/ranking";
import { getFreezeState } from "@/lib/tournament";

export const dynamic = "force-dynamic";

// Mínimo de palpites encerrados para concorrer a stats de média/taxa (evita
// que uma amostra de 1 jogo distorça aproveitamento, média de gols, etc.).
const MIN_SAMPLE = 5;

interface UserStat {
  username: string;
  hits: number; // palpites que pontuaram (acertou ao menos o vencedor)
  total: number;
  exact: number; // placares cravados
  bestHit: number; // maior sequência de acertos
  bestMiss: number; // maior sequência de erros
  curHit: number;
  curMiss: number;
  goalsSum: number; // soma de gols palpitados (mandante + visitante)
  draws: number; // palpites de empate
  errSum: number; // soma do |erro| de gols vs placar real
  errN: number; // palpites com placar real disponível
  leadMs: number; // soma da antecedência (kickoff - createdAt)
  leadN: number;
  bestDay: number; // mais pontos somados num único dia
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

// Célula compacta do painel pessoal ("Minhas estatísticas").
function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="mini">
      <p className="mini-label">{label}</p>
      <p className="mini-value">
        {value}
        {unit && <small> {unit}</small>}
      </p>
    </div>
  );
}

export default async function EstatisticasPage() {
  const me = await getCurrentUser();
  const freeze = await getFreezeState();
  // Congelado nas semis: as estatísticas e a posição também ficam na foto do
  // corte, pra não entregar o desfecho do bolão antes da revelação.
  const predWhere = freeze.frozen
    ? { points: { not: null }, match: { kickoff: { lt: freeze.cutoff! } } }
    : { points: { not: null } };
  const [preds, users, tournamentBets] = await Promise.all([
    prisma.prediction.findMany({
      where: predWhere,
      include: {
        match: {
          select: {
            stage: true,
            kickoff: true,
            homeScore: true,
            awayScore: true,
          },
        },
        user: { select: { id: true, username: true } },
      },
      orderBy: { match: { kickoff: "asc" } },
    }),
    prisma.user.findMany({ select: { id: true } }),
    freeze.frozen
      ? Promise.resolve([])
      : prisma.tournamentBet.findMany({
          where: { points: { not: null } },
          select: { userId: true, points: true },
        }),
  ]);

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
  // Pontos por dia: userId -> (dia -> pontos), para o recorde de "dia inspirado".
  const dayPts = new Map<number, Map<string, number>>();
  // Placar mais palpitado por todo mundo: "h-a" -> quantidade.
  const scoreCount = new Map<string, number>();

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
        goalsSum: 0,
        draws: 0,
        errSum: 0,
        errN: 0,
        leadMs: 0,
        leadN: 0,
        bestDay: 0,
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

    // Estilo de palpite e precisão.
    s.goalsSum += p.homeScore + p.awayScore;
    if (p.homeScore === p.awayScore) s.draws++;
    if (p.match.homeScore !== null && p.match.awayScore !== null) {
      s.errSum +=
        Math.abs(p.homeScore - p.match.homeScore) +
        Math.abs(p.awayScore - p.match.awayScore);
      s.errN++;
    }
    const lead = p.match.kickoff.getTime() - p.createdAt.getTime();
    if (lead > 0) {
      s.leadMs += lead;
      s.leadN++;
    }

    // Placar mais palpitado (coletivo).
    const key = `${p.homeScore}-${p.awayScore}`;
    scoreCount.set(key, (scoreCount.get(key) ?? 0) + 1);

    // Pontos por dia (para "dia inspirado").
    const day = dayKey(p.match.kickoff);
    if (!dayPts.has(p.user.id)) dayPts.set(p.user.id, new Map());
    const dm = dayPts.get(p.user.id)!;
    dm.set(day, (dm.get(day) ?? 0) + pts);

    const stage = p.match.stage;
    if (!byStage.has(stage)) byStage.set(stage, new Map());
    const sm = byStage.get(stage)!;
    sm.set(p.user.id, (sm.get(p.user.id) ?? 0) + pts);
  }

  // Melhor dia de cada um (maior soma de pontos num único dia).
  for (const [userId, dm] of dayPts) {
    byUser.get(userId)!.bestDay = Math.max(0, ...dm.values());
  }

  const stats = [...byUser.values()];

  // Helper de "campeão"/"lanterna" de cada estatística (lida com empates).
  function extremeBy(
    pick: (s: UserStat) => number,
    dir: "max" | "min" = "max",
    eligible: (s: UserStat) => boolean = () => true,
  ): { value: number; names: string[] } {
    const pool = stats.filter(eligible);
    if (pool.length === 0) return { value: 0, names: [] };
    const vals = pool.map(pick);
    const value = dir === "max" ? Math.max(...vals) : Math.min(...vals);
    const names = pool.filter((s) => pick(s) === value).map((s) => s.username);
    return { value, names };
  }

  const enoughSample = (s: UserStat) => s.total >= MIN_SAMPLE;

  const bestHit = extremeBy((s) => s.bestHit);
  const bestMiss = extremeBy((s) => s.bestMiss);
  const mostExact = extremeBy((s) => s.exact);
  const bestDay = extremeBy((s) => s.bestDay);
  const mostDraws = extremeBy((s) => s.draws);
  const hotRate = extremeBy((s) => s.hits / s.total, "max", enoughSample);
  const goleador = extremeBy((s) => s.goalsSum / s.total, "max", enoughSample);
  const chegaJunto = extremeBy(
    (s) => s.errSum / s.errN,
    "min",
    (s) => s.errN >= MIN_SAMPLE,
  );
  const madrugador = extremeBy(
    (s) => s.leadMs / s.leadN,
    "max",
    (s) => s.leadN >= MIN_SAMPLE,
  );

  // Pé frio: menor aproveitamento entre quem tem amostra suficiente.
  const peFrioRes = extremeBy((s) => s.hits / s.total, "min", enoughSample);
  const peFrio =
    peFrioRes.names.length > 0
      ? { name: peFrioRes.names.join(", "), rate: peFrioRes.value }
      : null;

  // Placar mais palpitado por todo mundo.
  let popularScore: { label: string; count: number } | null = null;
  for (const [k, n] of scoreCount) {
    if (!popularScore || n > popularScore.count) {
      const [h, a] = k.split("-");
      popularScore = { label: `${h} × ${a}`, count: n };
    }
  }

  const fmtNames = (names: string[]) =>
    names.length === 0 ? "—" : names.join(", ");

  const fmtDec = (n: number) => n.toFixed(1).replace(".", ",");

  // Antecedência média -> texto curto ("18h" ou "3,2 dias").
  const fmtLead = (ms: number): { value: string; unit: string } => {
    const hours = ms / 3_600_000;
    return hours >= 24
      ? { value: fmtDec(hours / 24), unit: "dias" }
      : { value: String(Math.round(hours)), unit: "h" };
  };
  const lead = madrugador.names.length > 0 ? fmtLead(madrugador.value) : null;

  const stagesPresent = [...byStage.keys()].sort(
    (a, b) => stageRank(a) - stageRank(b),
  );

  // ---- Painel pessoal do usuário logado ------------------------------------
  // Reaproveita o UserStat já calculado e a posição no ranking geral (com bônus).
  const ranking = computeRanking(users, preds, tournamentBets);
  const myRankIdx = me ? ranking.findIndex((r) => r.user.id === me.id) : -1;
  const myRank = myRankIdx >= 0 ? ranking[myRankIdx] : null;
  const mine = me ? byUser.get(me.id) ?? null : null;
  const myStagePoints =
    mine && me
      ? stagesPresent
          .map((stage) => ({
            stage,
            points: byStage.get(stage)?.get(me.id) ?? 0,
          }))
          .filter((s) => s.points > 0)
      : [];

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

      {mine && myRank && (
        <>
          <div className="section-head">
            <h2>
              <span className="star">★</span> Minhas estatísticas
            </h2>
            <span className="bar" />
            <span className="daytag">{me!.username}</span>
          </div>

          <section className="strip" style={{ gridTemplateColumns: "1fr" }}>
            <div className="ticket">
              <div className="medal">{myRankIdx + 1}º</div>
              <div style={{ flex: 1 }}>
                <p className="label">Sua posição no ranking geral</p>
                <p className="big">
                  {myRank.total} <small>pts em {ranking.length} jogadores</small>
                </p>
                <div className="ticket-meta">
                  <span>
                    <b>{myRank.exact}</b> cravados
                  </span>
                  <span>
                    <b>{myRank.partial}</b> parciais
                  </span>
                  {myRank.bonus > 0 && (
                    <span>
                      <b>{myRank.bonus}</b> de bônus
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mini-grid">
            <MiniStat
              label="Aproveitamento"
              value={`${Math.round((mine.hits / mine.total) * 100)}`}
              unit="%"
            />
            <MiniStat
              label="Palpites pontuados"
              value={String(mine.hits)}
              unit={`de ${mine.total}`}
            />
            <MiniStat label="Placares cravados" value={String(mine.exact)} />
            <MiniStat
              label="Melhor sequência"
              value={mine.bestHit > 0 ? String(mine.bestHit) : "—"}
              unit={mine.bestHit > 0 ? "seguidos" : undefined}
            />
            <MiniStat
              label="Gols por palpite"
              value={fmtDec(mine.goalsSum / mine.total)}
            />
            {mine.errN > 0 && (
              <MiniStat
                label="Erro médio de placar"
                value={fmtDec(mine.errSum / mine.errN)}
                unit="gols"
              />
            )}
            <MiniStat
              label="Dia mais inspirado"
              value={mine.bestDay > 0 ? String(mine.bestDay) : "—"}
              unit={mine.bestDay > 0 ? "pts" : undefined}
            />
            <MiniStat label="Palpites de empate" value={String(mine.draws)} />
          </section>

          {myStagePoints.length > 0 && (
            <div className="mini-fases">
              {myStagePoints.map(({ stage, points }) => (
                <span className="mini-fase" key={stage}>
                  {stageLabel(stage)} <b>{points}</b>
                </span>
              ))}
            </div>
          )}

          <div className="section-head">
            <h2>
              <span className="star">★</span> Recordes do bolão
            </h2>
            <span className="bar" />
            <span className="daytag">Quem manda em cada quesito</span>
          </div>
        </>
      )}

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
            peFrio ? peFrio.name : `exige ${MIN_SAMPLE}+ palpites encerrados`
          }
        />
        <StatCard
          emoji="🌡️"
          variant="hot"
          corner="MIRA"
          title="Mais quente · melhor aproveitamento"
          value={
            hotRate.names.length > 0
              ? `${Math.round(hotRate.value * 100)}`
              : "—"
          }
          unit={hotRate.names.length > 0 ? "%" : undefined}
          who={
            hotRate.names.length > 0
              ? fmtNames(hotRate.names)
              : `exige ${MIN_SAMPLE}+ palpites encerrados`
          }
        />
        <StatCard
          emoji="📅"
          variant="hot"
          corner="DIA CHEIO"
          title="Dia mais inspirado"
          value={bestDay.value > 0 ? String(bestDay.value) : "—"}
          unit={bestDay.value > 0 ? "pts num dia" : undefined}
          who={bestDay.value > 0 ? fmtNames(bestDay.names) : undefined}
        />
        <StatCard
          emoji="⚽"
          variant="hot"
          corner="ARTILHARIA"
          title="Goleador · mais gols por palpite"
          value={goleador.names.length > 0 ? fmtDec(goleador.value) : "—"}
          unit={goleador.names.length > 0 ? "gols/jogo" : undefined}
          who={goleador.names.length > 0 ? fmtNames(goleador.names) : undefined}
        />
        <StatCard
          emoji="🤝"
          variant="hot"
          corner="X+X"
          title="O empatador · mais palpites de empate"
          value={mostDraws.value > 0 ? String(mostDraws.value) : "—"}
          unit={mostDraws.value > 0 ? "empates" : undefined}
          who={mostDraws.value > 0 ? fmtNames(mostDraws.names) : undefined}
        />
        <StatCard
          emoji="📏"
          variant="hot"
          corner="QUASE LÁ"
          title="Chega junto · menor erro de placar"
          value={chegaJunto.names.length > 0 ? fmtDec(chegaJunto.value) : "—"}
          unit={chegaJunto.names.length > 0 ? "gols de erro" : undefined}
          who={
            chegaJunto.names.length > 0
              ? fmtNames(chegaJunto.names)
              : `exige ${MIN_SAMPLE}+ palpites encerrados`
          }
        />
        <StatCard
          emoji="⏰"
          variant="hot"
          corner="MADRUGADOR"
          title="Quem palpita com mais antecedência"
          value={lead ? lead.value : "—"}
          unit={lead ? lead.unit : undefined}
          who={
            lead
              ? fmtNames(madrugador.names)
              : `exige ${MIN_SAMPLE}+ palpites encerrados`
          }
        />
        <StatCard
          emoji="🗳️"
          variant="hot"
          corner="DO POVO"
          title="Placar mais palpitado por todos"
          value={popularScore ? popularScore.label : "—"}
          who={
            popularScore ? `${popularScore.count} palpites` : undefined
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
