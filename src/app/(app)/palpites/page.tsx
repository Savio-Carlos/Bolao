import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isOpenForPrediction } from "@/lib/football/types";
import PredictionsEditor, { type EditableMatch } from "./PredictionsEditor";

export const dynamic = "force-dynamic";

export default async function PalpitesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout já redireciona

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
  ]);

  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const open: EditableMatch[] = matches
    .filter((m) => isOpenForPrediction(m))
    .map((m) => {
      const p = predByMatch.get(m.id);
      return {
        matchId: m.id,
        stage: m.stage,
        group: m.group,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeCrest: m.homeCrest,
        awayCrest: m.awayCrest,
        kickoff: m.kickoff.toISOString(),
        predHome: p?.homeScore ?? null,
        predAway: p?.awayScore ?? null,
      };
    });

  return (
    <>
      <header className="page-head">
        <p className="kicker">★ Sua cartela de palpites</p>
        <h1>
          Meus <em>Palpites</em>
        </h1>
        <p className="sub">
          Cravou o placar? Vale <b>10</b>. Acertou só o vencedor ou o empate?
          Vale <b>5</b>. Você pode editar cada jogo <b>até o apito inicial</b>.
        </p>
        <div className="page-rule" />
      </header>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Abertos para palpite
        </h2>
        <span className="bar" />
      </div>

      {open.length === 0 ? (
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            Nenhum jogo aberto para palpite no momento.
          </p>
        </div>
      ) : (
        <PredictionsEditor matches={open} />
      )}
    </>
  );
}
