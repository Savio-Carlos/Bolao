import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  isOpenForPrediction,
  computePoints,
  groupLabel,
  stageLabel,
} from "@/lib/football/types";
import { formatDay } from "@/lib/format";
import { Crest } from "@/components/Crest";
import { Countdown } from "@/components/Countdown";
import PredictionsEditor, { type EditableMatch } from "./PredictionsEditor";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];
type Prediction = Awaited<ReturnType<typeof prisma.prediction.findMany>>[number];

function pointsBadge(pts: number): { cls: string; text: string } {
  if (pts === 10) return { cls: "exato", text: "+10 cravado!" };
  if (pts === 5) return { cls: "parcial", text: "+5 vencedor" };
  return { cls: "zero", text: "0 pts" };
}

function FinishedCard({ m, pred }: { m: Match; pred: Prediction | undefined }) {
  const realHome = m.homeScore!;
  const realAway = m.awayScore!;
  const hasPred =
    !!pred && pred.homeScore !== null && pred.awayScore !== null;
  const pts = hasPred
    ? pred!.points ??
      computePoints(pred!.homeScore!, pred!.awayScore!, realHome, realAway)
    : 0;
  const badge = hasPred ? pointsBadge(pts) : { cls: "zero", text: "sem palpite" };

  return (
    <div className="pcard locked">
      <div className="pc-top">
        <span className="pc-meta">
          {stageLabel(m.stage)}
          {m.group ? ` · ${groupLabel(m.group)}` : ""} · {formatDay(m.kickoff)}
        </span>
        <span className="pill closed">Encerrado</span>
      </div>
      <div className="pc-body">
        <div className="pteam right">
          <div>
            <div className="nm">{m.homeTeam}</div>
          </div>
          <Crest src={m.homeCrest} size="sm" />
        </div>
        <div className="locked-score">
          <span className="ls">{realHome}</span>
          <span className="x">×</span>
          <span className="ls">{realAway}</span>
        </div>
        <div className="pteam">
          <Crest src={m.awayCrest} size="sm" />
          <div>
            <div className="nm">{m.awayTeam}</div>
          </div>
        </div>
      </div>
      <div className="pc-result">
        <span>
          {hasPred ? (
            <>
              Seu palpite:{" "}
              <b>
                {pred!.homeScore} × {pred!.awayScore}
              </b>{" "}
              · Resultado:{" "}
              <b>
                {realHome} × {realAway}
              </b>
            </>
          ) : (
            <>
              Você não palpitou · Resultado:{" "}
              <b>
                {realHome} × {realAway}
              </b>
            </>
          )}
        </span>
        <span className={`pts-badge ${badge.cls}`}>{badge.text}</span>
      </div>
    </div>
  );
}

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

  // Encerrados ("já valeram pontos"): qualquer jogo com placar real, mais recentes primeiro.
  const closed = matches
    .filter((m) => m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  const filled = open.filter(
    (m) => m.predHome !== null && m.predAway !== null,
  ).length;
  const firstKickoff = open[0]?.kickoff ?? null;

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

      {open.length > 0 && (
        <section className="strip" style={{ gridTemplateColumns: "1fr" }}>
          <div className="ticket">
            <div className="medal">{filled}</div>
            <div style={{ flex: 1 }}>
              <p className="label">Seu progresso nesta rodada</p>
              <p className="big">
                {filled} <small>de {open.length} jogos preenchidos</small>
              </p>
              <div className="ticket-meta">
                <span>
                  <b>{open.length}</b> abertos agora
                </span>
                {firstKickoff && (
                  <span>
                    fecha o 1º em{" "}
                    <b>
                      <Countdown target={firstKickoff} />
                    </b>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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

      {closed.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              <span className="star">★</span> Já valeram pontos
            </h2>
            <span className="bar" />
            <span className="daytag">Encerrados</span>
          </div>
          {closed.map((m) => (
            <FinishedCard key={m.id} m={m} pred={predByMatch.get(m.id)} />
          ))}
        </>
      )}
    </>
  );
}
