import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayKey, formatTime, isLive } from "@/lib/format";
import { stageLabel } from "@/lib/football/types";
import { computeGroupStandings, computeThirdPlaceRanking } from "@/lib/standings";
import { Crest } from "@/components/Crest";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];

// Rótulos curtos das fases, p/ caber nas colunas estreitas do chaveamento.
const SHORT_STAGE: Record<string, string> = {
  LAST_32: "16-avos",
  LAST_16: "Oitavas",
  QUARTER_FINALS: "Quartas",
  SEMI_FINALS: "Semifinais",
  FINAL: "Final",
  THIRD_PLACE: "3º lugar",
};

// "2026-06-28" + horário -> "28/06 · 16:00" (fuso de Brasília via format.ts).
function fmtShort(d: Date): string {
  const [, mm, dd] = dayKey(d).split("-");
  return `${dd}/${mm} · ${formatTime(d)}`;
}

function BkTeam({
  name,
  crest,
  score,
  win,
  lose,
}: {
  name: string | null;
  crest: string | null;
  score: number | null;
  win: boolean;
  lose: boolean;
}) {
  return (
    <div className={`bk2-row${win ? " win" : lose ? " lose" : ""}`}>
      <Crest src={crest} size="xs" />
      <span className="bk2-nm">{name ?? "A definir"}</span>
      <span className="bk2-sc">{score ?? ""}</span>
    </div>
  );
}

function BracketCard({ m, champ = false }: { m: Match; champ?: boolean }) {
  const decided = m.homeScore !== null && m.awayScore !== null;
  const homeWin = decided && m.homeScore! > m.awayScore!;
  const awayWin = decided && m.awayScore! > m.homeScore!;
  return (
    <Link href={`/jogos/${m.id}`} className={`bk2${champ ? " champ" : ""}`}>
      <div className="bk2-time">
        <span>{fmtShort(m.kickoff)}</span>
        {isLive(m.status) && <span className="bk2-live">● ao vivo</span>}
      </div>
      <BkTeam
        name={m.homeTeam}
        crest={m.homeCrest}
        score={m.homeScore}
        win={homeWin}
        lose={awayWin}
      />
      <BkTeam
        name={m.awayTeam}
        crest={m.awayCrest}
        score={m.awayScore}
        win={awayWin}
        lose={homeWin}
      />
    </Link>
  );
}

// Uma coluna (fase) de um dos lados do chaveamento.
function BracketCol({ stage, matches }: { stage: string; matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <div className="bk2-col">
      <span className="bk2-head">{SHORT_STAGE[stage] ?? stageLabel(stage)}</span>
      <div className="bk2-body">
        {matches.map((m) => (
          <BracketCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

export default async function ClassificacaoPage() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });

  if (matches.length === 0) {
    return (
      <>
        <header className="page-head">
          <p className="kicker">★ Quem avança no mundial</p>
          <h1>
            A <em>Classificação</em>
          </h1>
          <div className="page-rule" />
        </header>
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            Nenhum jogo carregado ainda. Um admin precisa sincronizar os jogos na
            área de <b>Admin</b>.
          </p>
        </div>
      </>
    );
  }

  const standings = computeGroupStandings(matches);
  const thirds = computeThirdPlaceRanking(standings);

  // Escudos por nome de seleção (a partir dos jogos), para enfeitar as tabelas.
  const crestByTeam = new Map<string, string>();
  for (const m of matches) {
    if (m.homeTeam && m.homeCrest) crestByTeam.set(m.homeTeam, m.homeCrest);
    if (m.awayTeam && m.awayCrest) crestByTeam.set(m.awayTeam, m.awayCrest);
  }

  // Mata-mata agrupado por fase (cada lista já vem em ordem de horário).
  const knockout = matches.filter((m) => m.stage !== "GROUP_STAGE");
  const byStage = new Map<string, Match[]>();
  for (const m of knockout) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }
  const ms = (s: string) => byStage.get(s) ?? [];
  // Divide cada fase em dois lados, p/ o chaveamento espelhado com a final no meio.
  const half = (a: Match[]): [Match[], Match[]] => {
    const h = Math.ceil(a.length / 2);
    return [a.slice(0, h), a.slice(h)];
  };
  const [r32L, r32R] = half(ms("LAST_32"));
  const [r16L, r16R] = half(ms("LAST_16"));
  const [qfL, qfR] = half(ms("QUARTER_FINALS"));
  const [sfL, sfR] = half(ms("SEMI_FINALS"));
  const finalM = ms("FINAL")[0] ?? null;
  const third = ms("THIRD_PLACE")[0] ?? null;

  return (
    <>
      <header className="page-head">
        <p className="kicker">★ Quem avança no mundial</p>
        <h1>
          A <em>Classificação</em>
        </h1>
        <p className="sub">
          Os dois primeiros de cada grupo avançam direto, mais os{" "}
          <b>8 melhores terceiros</b>. Critério de desempate: pontos → saldo de
          gols → gols pró.
        </p>
        <div className="page-rule" />
      </header>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Fase de grupos
        </h2>
        <span className="bar" />
      </div>

      <section className="groups">
        {standings.map(({ group, rows }) => (
          <div className="gcard" key={group}>
            <h3>
              <span>Grupo</span>
              <span className="gn">{group.replace("GROUP_", "")}</span>
            </h3>
            <table className="gtable">
              <thead>
                <tr>
                  <th className="l">Seleção</th>
                  <th>P</th>
                  <th>J</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>SG</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.team}
                    className={i < 2 ? "q1" : i === 2 ? "q2" : ""}
                  >
                    <td className="tm">
                      <div className="tm-in">
                        <span className="pos">{i + 1}</span>
                        <Crest src={crestByTeam.get(r.team) ?? null} size="xs" />
                        <span className="nm">{r.team}</span>
                      </div>
                    </td>
                    <td className="p">{r.points}</td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div
          className="gcard"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <p
            className="legend"
            style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
          >
            <span>
              <span
                className="swatch"
                style={{
                  background:
                    "color-mix(in srgb,var(--green) 50%,var(--paper-2))",
                }}
              />{" "}
              1º e 2º classificam direto
            </span>
            <span>
              <span
                className="swatch"
                style={{
                  background:
                    "color-mix(in srgb,var(--gold-foil) 70%,var(--paper-2))",
                }}
              />{" "}
              os 8 melhores 3ºs avançam
            </span>
            <span style={{ color: "var(--ink-faint)" }}>
              P pontos · J jogos · SG saldo
            </span>
          </p>
        </div>
      </section>

      {thirds.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              <span className="star">★</span> Melhores terceiros
            </h2>
            <span className="bar" />
            <span className="daytag">8 vagas</span>
          </div>
          <p
            className="legend"
            style={{ margin: "0 0 12px", color: "var(--ink-faint)" }}
          >
            Os <b>8 melhores 3ºs colocados</b> entre os 12 grupos avançam (em
            verde). Parcial — atualiza conforme os jogos terminam.
          </p>
          <div className="alm-table-wrap">
            <table className="alm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="l">Seleção</th>
                  <th>Grupo</th>
                  <th>P</th>
                  <th>J</th>
                  <th>SG</th>
                  <th>GP</th>
                  <th className="r">Vaga</th>
                </tr>
              </thead>
              <tbody>
                {thirds.map((t, i) => (
                  <tr key={t.team} className={t.qualifies ? "q-in" : "q-out"}>
                    <td className="num">{i + 1}</td>
                    <td className="l">
                      <span className="tm-in">
                        <Crest src={crestByTeam.get(t.team) ?? null} size="xs" />
                        <span className="name">{t.team}</span>
                      </span>
                    </td>
                    <td>{t.group.replace("GROUP_", "")}</td>
                    <td className="num">{t.points}</td>
                    <td className="num">{t.played}</td>
                    <td className="num">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                    <td className="num">{t.gf}</td>
                    <td className="r">{t.qualifies ? "✓ avança" : "fora"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {knockout.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              <span className="star">★</span> Mata-mata
            </h2>
            <span className="bar" />
            <span className="daytag">Rumo ao título</span>
          </div>

          <div className="bracket2-wrap">
            <div className="bracket2">
              {/* Lado esquerdo: do 16-avos rumo à final */}
              <BracketCol stage="LAST_32" matches={r32L} />
              <BracketCol stage="LAST_16" matches={r16L} />
              <BracketCol stage="QUARTER_FINALS" matches={qfL} />
              <BracketCol stage="SEMI_FINALS" matches={sfL} />

              {/* Centro: final + disputa de 3º */}
              <div className="bk2-col center">
                {finalM && (
                  <div className="bk2-final">
                    <span className="bk2-head final">🏆 Final</span>
                    <div className="bk2-body">
                      <BracketCard m={finalM} champ />
                    </div>
                  </div>
                )}
                {third && (
                  <div className="bk2-third">
                    <span className="bk2-head">3º lugar</span>
                    <div className="bk2-body">
                      <BracketCard m={third} />
                    </div>
                  </div>
                )}
              </div>

              {/* Lado direito: espelhado */}
              <BracketCol stage="SEMI_FINALS" matches={sfR} />
              <BracketCol stage="QUARTER_FINALS" matches={qfR} />
              <BracketCol stage="LAST_16" matches={r16R} />
              <BracketCol stage="LAST_32" matches={r32R} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
