import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { dayKey } from "@/lib/format";
import { LineChart, PALETTE, ME_COLOR, type Series } from "./LineChart";
import { StackedBars, type BarRow } from "./StackedBars";
import { ScoreHeatmap } from "./ScoreHeatmap";

export const dynamic = "force-dynamic";

function dayShort(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export default async function GraficosPage() {
  const me = await getCurrentUser();
  const preds = await prisma.prediction.findMany({
    where: { points: { not: null } },
    include: {
      match: { select: { kickoff: true } },
      user: { select: { id: true, username: true } },
    },
    orderBy: { match: { kickoff: "asc" } },
  });

  if (preds.length === 0) {
    return (
      <>
        <header className="page-head">
          <p className="kicker">★ A corrida pelo título, dia a dia</p>
          <h1>
            Os <em>Gráficos</em>
          </h1>
          <div className="page-rule" />
        </header>
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            Os gráficos aparecem aqui assim que os primeiros jogos forem
            encerrados. 📈
          </p>
        </div>
      </>
    );
  }

  const nameById = new Map<number, string>();
  for (const p of preds) nameById.set(p.user.id, p.user.username);
  const userIds = [...nameById.keys()];

  // Pontos ganhos por dia (na ordem cronológica).
  const days: string[] = [];
  const perDay = new Map<string, Map<number, number>>();
  // Composição dos pontos (cravadas/parciais/zeros) por jogador.
  const breakdown = new Map<
    number,
    { exact: number; partial: number; zero: number }
  >();
  // Frequência de cada placar palpitado, para o mapa de calor.
  const scoreGrid = new Map<string, number>();
  let maxGoal = 0;

  for (const p of preds) {
    const pts = p.points ?? 0;

    const day = dayKey(p.match.kickoff);
    if (!perDay.has(day)) {
      perDay.set(day, new Map());
      days.push(day);
    }
    const m = perDay.get(day)!;
    m.set(p.user.id, (m.get(p.user.id) ?? 0) + pts);

    const b = breakdown.get(p.user.id) ?? { exact: 0, partial: 0, zero: 0 };
    if (pts === 10) b.exact++;
    else if (pts === 5) b.partial++;
    else b.zero++;
    breakdown.set(p.user.id, b);

    const sk = `${p.homeScore}-${p.awayScore}`;
    scoreGrid.set(sk, (scoreGrid.get(sk) ?? 0) + 1);
    maxGoal = Math.max(maxGoal, p.homeScore, p.awayScore);
  }

  // Cumulativo por dia (carrega o total anterior mesmo sem pontuar no dia).
  const cum = new Map<number, number>(userIds.map((id) => [id, 0]));
  const cumByUser = new Map<number, number[]>(userIds.map((id) => [id, []]));
  for (const day of days) {
    const m = perDay.get(day)!;
    for (const id of userIds) {
      cum.set(id, cum.get(id)! + (m.get(id) ?? 0));
      cumByUser.get(id)!.push(cum.get(id)!);
    }
  }

  // Diferença para o líder em cada dia (líder = 0).
  const leaderByDay = days.map((_, i) =>
    Math.max(...userIds.map((id) => cumByUser.get(id)![i])),
  );
  const gapByUser = new Map<number, number[]>(
    userIds.map((id) => [
      id,
      cumByUser.get(id)!.map((v, i) => leaderByDay[i] - v),
    ]),
  );

  // Ordena os jogadores pelo total final (para cores e legenda estáveis).
  const ordered = [...userIds].sort(
    (a, b) =>
      cumByUser.get(b)!.at(-1)! - cumByUser.get(a)!.at(-1)! ||
      nameById.get(a)!.localeCompare(nameById.get(b)!, "pt-BR"),
  );

  const labels = days.map(dayShort);
  const evolution: Series[] = ordered.map((id, i) => ({
    name: nameById.get(id)!,
    color: me?.id === id ? ME_COLOR : PALETTE[i % PALETTE.length],
    values: cumByUser.get(id)!,
    me: me?.id === id,
  }));
  const gap: Series[] = ordered.map((id, i) => ({
    name: nameById.get(id)!,
    color: me?.id === id ? ME_COLOR : PALETTE[i % PALETTE.length],
    values: gapByUser.get(id)!,
    me: me?.id === id,
  }));

  // Posição no ranking em cada dia (1 = líder). Empates dividem a posição.
  const rankByUser = new Map<number, number[]>(userIds.map((id) => [id, []]));
  for (let i = 0; i < days.length; i++) {
    const vals = userIds
      .map((id) => ({ id, v: cumByUser.get(id)![i] }))
      .sort((a, b) => b.v - a.v);
    let rank = 0;
    let seen = 0;
    let prev = Infinity;
    for (const { id, v } of vals) {
      seen++;
      if (v < prev) {
        rank = seen;
        prev = v;
      }
      rankByUser.get(id)!.push(rank);
    }
  }
  const rankSeries: Series[] = ordered.map((id, i) => ({
    name: nameById.get(id)!,
    color: me?.id === id ? ME_COLOR : PALETTE[i % PALETTE.length],
    values: rankByUser.get(id)!,
    me: me?.id === id,
  }));

  // Composição dos pontos por jogador (ordenado pelo total final).
  const barRows: BarRow[] = ordered.map((id) => {
    const b = breakdown.get(id) ?? { exact: 0, partial: 0, zero: 0 };
    return {
      name: nameById.get(id)!,
      me: me?.id === id,
      exact: b.exact,
      partial: b.partial,
      zero: b.zero,
      exactPts: b.exact * 10,
      partialPts: b.partial * 5,
      total: b.exact * 10 + b.partial * 5,
    };
  });

  // Mapa de calor: placar mais palpitado em destaque, eixo de 0..dim.
  const dim = Math.min(6, maxGoal);
  let topKey: string | null = null;
  let topN = 0;
  for (const [k, n] of scoreGrid) {
    if (n > topN) {
      topN = n;
      topKey = k;
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="kicker">★ A corrida pelo título, dia a dia</p>
        <h1>
          Os <em>Gráficos</em>
        </h1>
        <p className="sub">
          Como cada jogador evoluiu ao longo do mundial — e o quão perto está do
          líder.
        </p>
        <div className="page-rule" />
      </header>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Evolução do ranking
        </h2>
        <span className="bar" />
      </div>
      <div className="chart-card">
        <h3>Pontos acumulados</h3>
        <p className="desc">Total de pontos por jogador ao longo dos dias.</p>
        <LineChart labels={labels} series={evolution} />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Corrida pelas posições
        </h2>
        <span className="bar" />
        <span className="daytag">Topo = liderança</span>
      </div>
      <div className="chart-card">
        <h3>Posição no ranking, dia a dia</h3>
        <p className="desc">
          Como cada um subiu e desceu na tabela. Linhas que se cruzam são
          ultrapassagens.
        </p>
        <LineChart
          labels={labels}
          series={rankSeries}
          invert
          unit="Mais alto = melhor posição."
        />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Diferença para o líder
        </h2>
        <span className="bar" />
        <span className="daytag">Topo = liderança</span>
      </div>
      <div className="chart-card">
        <h3>Distância do topo</h3>
        <p className="desc">
          Quantos pontos cada um está atrás do líder. Quanto mais alto, mais
          perto do topo.
        </p>
        <LineChart
          labels={labels}
          series={gap}
          invert
          unit="Menor = mais perto do topo."
        />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Composição dos pontos
        </h2>
        <span className="bar" />
        <span className="daytag">De onde vêm os pontos</span>
      </div>
      <div className="chart-card">
        <h3>Cravadas vs. parciais</h3>
        <p className="desc">
          Quanto do total de cada jogador veio de placar cravado (+10) e quanto
          de acerto parcial (+5).
        </p>
        <StackedBars rows={barRows} />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Mapa dos placares
        </h2>
        <span className="bar" />
        <span className="daytag">O que o povo chuta</span>
      </div>
      <div className="chart-card">
        <h3>Placares mais palpitados</h3>
        <p className="desc">
          A frequência de cada placar nos palpites de todo mundo. O mais comum
          fica destacado.
        </p>
        <ScoreHeatmap counts={scoreGrid} dim={dim} topKey={topKey} />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Pontos por rodada
        </h2>
        <span className="bar" />
        <span className="daytag">Por dia</span>
      </div>
      <div className="day-table-wrap">
        <table className="day-table">
          <thead>
            <tr>
              <th className="l">Jogador</th>
              {days.map((d) => (
                <th key={d}>{dayShort(d)}</th>
              ))}
              <th className="r">Total</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((id) => (
              <tr key={id} className={me?.id === id ? "me" : ""}>
                <td className="l">{nameById.get(id)}</td>
                {days.map((d) => {
                  const pts = perDay.get(d)!.get(id) ?? 0;
                  return (
                    <td key={d} className={pts === 0 ? "zero" : ""}>
                      {pts}
                    </td>
                  );
                })}
                <td className="tot">{cumByUser.get(id)!.at(-1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
