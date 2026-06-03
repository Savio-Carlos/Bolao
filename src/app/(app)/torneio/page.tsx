import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  SIMPLE_CATEGORIES,
  UPSET,
  normalize,
  tournamentDeadlineOpen,
  upsetStageLabel,
} from "@/lib/tournament";
import TournamentEditor, { type EditorValues } from "./TournamentEditor";

export const dynamic = "force-dynamic";

function zebraText(team: string | null, stage: string | null): string {
  if (!team) return "—";
  const label = upsetStageLabel(stage);
  return label ? `${team} (${label})` : team;
}

export default async function TorneioPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout já redireciona

  const [myBet, allBets, result, groupMatches, open] = await Promise.all([
    prisma.tournamentBet.findUnique({ where: { userId: user.id } }),
    prisma.tournamentBet.findMany({
      include: { user: { select: { username: true } } },
    }),
    prisma.tournamentResult.findUnique({ where: { id: 1 } }),
    prisma.match.findMany({
      where: { stage: "GROUP_STAGE" },
      select: { homeTeam: true, awayTeam: true },
    }),
    tournamentDeadlineOpen(),
  ]);

  const teams = [
    ...new Set(
      groupMatches
        .flatMap((m) => [m.homeTeam, m.awayTeam])
        .filter((t): t is string => !!t),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const initial: EditorValues = {
    champion: myBet?.champion ?? "",
    runnerUp: myBet?.runnerUp ?? "",
    topScorer: myBet?.topScorer ?? "",
    bestPlayer: myBet?.bestPlayer ?? "",
    upsetTeam: myBet?.upsetTeam ?? "",
    upsetStage: myBet?.upsetStage ?? "",
  };

  const ranked = [...allBets].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <>
      <header className="page-head">
        <p className="kicker">★ Palpites de longo prazo — bônus pesado</p>
        <h1>
          Palpites da <em>Copa</em>
        </h1>
        <p className="sub">
          As apostas que valem mais pontos no bolão. Editáveis{" "}
          <b>até o apito do primeiro jogo</b> — depois, é torcer.{" "}
          {SIMPLE_CATEGORIES.map((c) => `${c.label} ${c.points}`).join(" · ")} ·
          Maior zebra {UPSET.totalPoints} ({UPSET.teamPoints} seleção +{" "}
          {UPSET.stagePoints} fase).
        </p>
        <div className="page-rule" />
      </header>

      <TournamentEditor
        categories={SIMPLE_CATEGORIES}
        initial={initial}
        teams={teams}
        open={open}
      />

      <div className="section-head">
        <h2>
          <span className="star">★</span> Palpites de todos
        </h2>
        <span className="bar" />
        <span className="daytag">Bônus a apurar</span>
      </div>

      {ranked.length === 0 ? (
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            Ninguém palpitou ainda.
          </p>
        </div>
      ) : (
        <div className="alm-table-wrap" style={{ overflowX: "auto" }}>
          <table className="alm-table">
            <thead>
              <tr>
                <th className="l">Jogador</th>
                {SIMPLE_CATEGORIES.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Maior zebra</th>
                <th className="r">Bônus</th>
              </tr>
            </thead>
            <tbody>
              {result && (
                <tr className="gabarito">
                  <td className="l">
                    <span className="name">✅ Gabarito</span>
                  </td>
                  {SIMPLE_CATEGORIES.map((c) => (
                    <td key={c.key}>
                      {(result[c.key] as string | null) ?? "—"}
                    </td>
                  ))}
                  <td>{zebraText(result.upsetTeam, result.upsetStage)}</td>
                  <td className="r"></td>
                </tr>
              )}
              {ranked.map((bet) => {
                const zebraHit =
                  result?.upsetTeam &&
                  normalize(bet.upsetTeam) === normalize(result.upsetTeam);
                return (
                  <tr
                    key={bet.id}
                    className={bet.userId === user.id ? "me" : ""}
                  >
                    <td className="l">
                      <span className="name">{bet.user.username}</span>
                    </td>
                    {SIMPLE_CATEGORIES.map((c) => {
                      const val = (bet[c.key] as string | null) ?? "";
                      const official = result
                        ? (result[c.key] as string | null)
                        : null;
                      const hit =
                        official && normalize(val) === normalize(official);
                      return (
                        <td
                          key={c.key}
                          style={
                            hit
                              ? { color: "var(--green)", fontWeight: 700 }
                              : undefined
                          }
                        >
                          {val || "—"}
                        </td>
                      );
                    })}
                    <td
                      style={
                        zebraHit
                          ? { color: "var(--green)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {zebraText(bet.upsetTeam, bet.upsetStage)}
                    </td>
                    <td className="r num" style={{ fontWeight: 700 }}>
                      {bet.points ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
