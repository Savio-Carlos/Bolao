import Link from "next/link";
import { prisma } from "@/lib/db";
import { isLive, statusLabel } from "@/lib/format";
import { stageLabel, stageRank } from "@/lib/football/types";
import { computeGroupStandings } from "@/lib/standings";
import { Crest } from "@/components/Crest";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];

function BracketRow({
  name,
  crest,
  score,
  outcome,
}: {
  name: string | null;
  crest: string | null;
  score: number | null;
  outcome: "win" | "lose" | "";
}) {
  return (
    <div className={`row${outcome ? ` ${outcome}` : ""}`}>
      <Crest src={crest} size="xs" />
      <span className="nm">{name ?? "A definir"}</span>
      <span className="sc">{score ?? "—"}</span>
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

  // Escudos por nome de seleção (a partir dos jogos), para enfeitar as tabelas.
  const crestByTeam = new Map<string, string>();
  for (const m of matches) {
    if (m.homeTeam && m.homeCrest) crestByTeam.set(m.homeTeam, m.homeCrest);
    if (m.awayTeam && m.awayCrest) crestByTeam.set(m.awayTeam, m.awayCrest);
  }

  // Mata-mata agrupado por fase, em ordem.
  const knockout = matches.filter((m) => m.stage !== "GROUP_STAGE");
  const stages = [...new Set(knockout.map((m) => m.stage))].sort(
    (a, b) => stageRank(a) - stageRank(b),
  );
  const byStage = new Map<string, Match[]>();
  for (const m of knockout) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }

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

      {stages.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              <span className="star">★</span> Mata-mata
            </h2>
            <span className="bar" />
            <span className="daytag">Rumo ao título</span>
          </div>

          <section className="bracket">
            {stages.map((stage) => {
              const isFinal = stage === "FINAL";
              return (
                <div className={`bk-col${isFinal ? " final" : ""}`} key={stage}>
                  <h3>{stageLabel(stage)}</h3>
                  <div className="bk-matches">
                  {byStage.get(stage)!.map((m) => {
                    const decided =
                      m.homeScore !== null && m.awayScore !== null;
                    const homeWin = decided && m.homeScore! > m.awayScore!;
                    const awayWin = decided && m.awayScore! > m.homeScore!;
                    return (
                      <Link
                        key={m.id}
                        href={`/jogos/${m.id}`}
                        className={`bk${isFinal && decided ? " champ" : ""}`}
                      >
                        <BracketRow
                          name={m.homeTeam}
                          crest={m.homeCrest}
                          score={m.homeScore}
                          outcome={homeWin ? "win" : awayWin ? "lose" : ""}
                        />
                        <div className="div" />
                        <BracketRow
                          name={m.awayTeam}
                          crest={m.awayCrest}
                          score={m.awayScore}
                          outcome={awayWin ? "win" : homeWin ? "lose" : ""}
                        />
                        <span className={`st${isLive(m.status) ? " live" : ""}`}>
                          {statusLabel(m.status)}
                        </span>
                      </Link>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
