import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { dayKey } from "@/lib/format";
import { stageLabel, stageRank, STAGE_ORDER } from "@/lib/football/types";
import { LineChart, PALETTE, ME_COLOR, type Series } from "./LineChart";
import { StackedBars, type BarRow } from "./StackedBars";
import { MetricBars, type MetricRow } from "./MetricBars";
import { SegmentBars, type SegRow } from "./SegmentBars";
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
      match: { select: { kickoff: true, stage: true, advancer: true } },
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
  // Gols palpitados (soma e contagem) por jogador, para a média.
  const goals = new Map<number, { sum: number; n: number }>();
  // Pontos por fase: userId -> (stage -> pontos).
  const stagePts = new Map<number, Map<string, number>>();
  // Acertos de "quem avança" no mata-mata: userId -> { acertos, total decidido }.
  const advance = new Map<number, { hit: number; total: number }>();
  // Frequência de cada placar palpitado, para o mapa de calor.
  const scoreGrid = new Map<string, number>();
  let maxGoal = 0;

  for (const p of preds) {
    const pts = p.points ?? 0; // pontos de placar (p/ a composição 10/5/0)
    // Total que conta no ranking = placar + bônus de "quem avança" (mata-mata).
    const scored = pts + (p.advancePoints ?? 0);

    // Pontos por fase.
    if (!stagePts.has(p.user.id)) stagePts.set(p.user.id, new Map());
    const sp = stagePts.get(p.user.id)!;
    sp.set(p.match.stage, (sp.get(p.match.stage) ?? 0) + scored);

    // Acerto de "quem avança": só conta jogos do mata-mata já decididos em que
    // a pessoa escolheu um lado.
    if (
      p.match.stage !== "GROUP_STAGE" &&
      p.match.advancer &&
      p.advancePick
    ) {
      const a = advance.get(p.user.id) ?? { hit: 0, total: 0 };
      a.total++;
      if (p.advancePick === p.match.advancer) a.hit++;
      advance.set(p.user.id, a);
    }

    const day = dayKey(p.match.kickoff);
    if (!perDay.has(day)) {
      perDay.set(day, new Map());
      days.push(day);
    }
    const m = perDay.get(day)!;
    m.set(p.user.id, (m.get(p.user.id) ?? 0) + scored);

    const b = breakdown.get(p.user.id) ?? { exact: 0, partial: 0, zero: 0 };
    if (pts === 10) b.exact++;
    else if (pts === 5) b.partial++;
    else b.zero++;
    breakdown.set(p.user.id, b);

    const g = goals.get(p.user.id) ?? { sum: 0, n: 0 };
    g.sum += p.homeScore + p.awayScore;
    g.n++;
    goals.set(p.user.id, g);

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

  const fmtDec = (v: number) => v.toFixed(1).replace(".", ",");

  // Aproveitamento: % dos palpites que pontuaram, do melhor pro pior.
  const aproveitamento: MetricRow[] = ordered
    .map((id) => {
      const b = breakdown.get(id) ?? { exact: 0, partial: 0, zero: 0 };
      const total = b.exact + b.partial + b.zero;
      const rate = total ? (b.exact + b.partial) / total : 0;
      return {
        name: nameById.get(id)!,
        me: me?.id === id,
        value: rate,
        display: `${Math.round(rate * 100)}%`,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Estilo de palpite: média de gols por jogo (artilheiro vs cauteloso).
  const mediaGols: MetricRow[] = ordered
    .map((id) => {
      const g = goals.get(id) ?? { sum: 0, n: 0 };
      const avg = g.n ? g.sum / g.n : 0;
      return {
        name: nameById.get(id)!,
        me: me?.id === id,
        value: avg,
        display: fmtDec(avg),
      };
    })
    .sort((a, b) => b.value - a.value);

  // Dias mais quentes: total de pontos somados por TODO MUNDO em cada dia.
  const heatDaily = days.map((day) => {
    let s = 0;
    for (const v of perDay.get(day)!.values()) s += v;
    return s;
  });
  const heatSeries: Series[] = [
    { name: "Pontos da galera", color: "var(--chart-1)", values: heatDaily },
  ];

  // Pontos por fase: barra empilhada por jogador, um segmento por fase com pontos.
  const stageColor = (stage: string) =>
    PALETTE[Math.max(0, STAGE_ORDER.indexOf(stage)) % PALETTE.length];
  const stagesWithPoints = [...STAGE_ORDER]
    .filter((s) => [...stagePts.values()].some((m) => (m.get(s) ?? 0) > 0))
    .sort((a, b) => stageRank(a) - stageRank(b));
  const phaseRows: SegRow[] = ordered.map((id) => {
    const sp = stagePts.get(id) ?? new Map<string, number>();
    const segments = stagesWithPoints.map((s) => ({
      value: sp.get(s) ?? 0,
      color: stageColor(s),
      title: `${stageLabel(s)}: ${sp.get(s) ?? 0} pts`,
    }));
    const total = segments.reduce((a, b) => a + b.value, 0);
    return {
      name: nameById.get(id)!,
      me: me?.id === id,
      segments,
      display: String(total),
    };
  });
  const phaseLegend = stagesWithPoints.map((s) => ({
    label: stageLabel(s),
    color: stageColor(s),
  }));

  // Acertos de "quem avança": acertou (verde) vs errou (vermelho), texto "x/y".
  const hasAdvanceData = [...advance.values()].some((a) => a.total > 0);
  const advanceRows: SegRow[] = ordered
    .map((id) => ({ id, ...(advance.get(id) ?? { hit: 0, total: 0 }) }))
    .sort((x, y) => y.total - x.total)
    .map((a) => ({
      name: nameById.get(a.id)!,
      me: me?.id === a.id,
      segments: [
        { value: a.hit, color: "var(--green)", title: `${a.hit} acerto(s)` },
        {
          value: a.total - a.hit,
          color: "var(--red)",
          title: `${a.total - a.hit} erro(s)`,
        },
      ],
      display: `${a.hit}/${a.total}`,
    }));

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
          rank
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
          <span className="star">★</span> Dias mais quentes
        </h2>
        <span className="bar" />
        <span className="daytag">Pontos de todos por dia</span>
      </div>
      <div className="chart-card">
        <h3>O termômetro do bolão</h3>
        <p className="desc">
          Quantos pontos a galera somou junta em cada dia. Os picos são as
          rodadas que mais renderam palpites certeiros.
        </p>
        <LineChart labels={labels} series={heatSeries} />
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
          <span className="star">★</span> Aproveitamento
        </h2>
        <span className="bar" />
        <span className="daytag">Taxa de acerto</span>
      </div>
      <div className="chart-card">
        <h3>Quem acerta mais</h3>
        <p className="desc">
          A fatia dos palpites de cada um que pontuou (cravou o placar ou acertou
          o vencedor). Do mais certeiro ao menos.
        </p>
        <MetricBars rows={aproveitamento} color="var(--green)" max={1} />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Estilo de palpite
        </h2>
        <span className="bar" />
        <span className="daytag">Gols por jogo</span>
      </div>
      <div className="chart-card">
        <h3>Artilheiro ou cauteloso?</h3>
        <p className="desc">
          A média de gols (mandante + visitante) que cada um coloca por jogo.
          Quanto maior, mais goleada o jogador costuma cravar.
        </p>
        <MetricBars rows={mediaGols} color="var(--gold)" />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Pontos por fase
        </h2>
        <span className="bar" />
        <span className="daytag">De que fase vêm os pontos</span>
      </div>
      <div className="chart-card">
        <h3>Onde cada um pontua</h3>
        <p className="desc">
          Quanto do total de cada jogador veio de cada fase do mundial. Vai
          ganhando cores à medida que o mata-mata avança.
        </p>
        <SegmentBars rows={phaseRows} legend={phaseLegend} />
      </div>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Quem avança
        </h2>
        <span className="bar" />
        <span className="daytag">Acertos no mata-mata</span>
      </div>
      <div className="chart-card">
        <h3>Faro para classificado</h3>
        <p className="desc">
          Nos jogos do mata-mata, quantas vezes cada um cravou o time que
          avançou (mesmo nos pênaltis).
        </p>
        {hasAdvanceData ? (
          <SegmentBars
            rows={advanceRows}
            legend={[
              { label: "Acertou", color: "var(--green)" },
              { label: "Errou", color: "var(--red)" },
            ]}
          />
        ) : (
          <p className="legend" style={{ color: "var(--ink-faint)" }}>
            Aparece quando o mata-mata começar. 🏆
          </p>
        )}
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
