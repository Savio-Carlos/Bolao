import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDay, formatTime, isLive, statusLabel } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";
import { Crest } from "@/components/Crest";

export const dynamic = "force-dynamic";

export default async function JogoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) notFound();

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, username: true } } },
  });

  const finished = match.status === "FINISHED";
  const decided = match.homeScore !== null && match.awayScore !== null;
  const live = isLive(match.status);

  // Ordena: maior pontuação primeiro (quando encerrado), depois por nome.
  const rows = [...predictions].sort(
    (a, b) =>
      (b.points ?? -1) - (a.points ?? -1) ||
      a.user.username.localeCompare(b.user.username, "pt-BR"),
  );

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <Link href="/" className="foot-link">
          ← voltar aos jogos
        </Link>
      </div>

      <article className="featured" style={{ marginTop: 14 }}>
        <div className="feat-top">
          <span className="feat-stage">
            <span className="star">★</span> {stageLabel(match.stage)}
            {match.group ? ` · ${groupLabel(match.group)}` : ""}
          </span>
          {live ? (
            <span className="live">
              <span className="dot" /> {statusLabel(match.status)}
            </span>
          ) : (
            <span className="feat-stage">
              {finished
                ? statusLabel(match.status)
                : `${formatDay(match.kickoff)} · ${formatTime(match.kickoff)}`}
            </span>
          )}
        </div>
        <div className="feat-body">
          <div className="team">
            <Crest src={match.homeCrest} />
            <div>
              <div className="tname">{match.homeTeam ?? "A definir"}</div>
            </div>
          </div>
          <div className="scorebox">
            <div className="sc">
              {decided ? (
                <>
                  <span>{match.homeScore}</span>
                  <span className="x">×</span>
                  <span>{match.awayScore}</span>
                </>
              ) : (
                <span className="x">×</span>
              )}
            </div>
            <div className="min">{statusLabel(match.status)}</div>
          </div>
          <div className="team right">
            <Crest src={match.awayCrest} />
            <div>
              <div className="tname">{match.awayTeam ?? "A definir"}</div>
            </div>
          </div>
        </div>
      </article>

      <div className="section-head">
        <h2>
          <span className="star">★</span> Palpites de todos
        </h2>
        <span className="bar" />
        <span className="daytag">{rows.length} palpites</span>
      </div>

      {rows.length === 0 ? (
        <div
          className="alm-table-wrap"
          style={{ padding: "32px", textAlign: "center" }}
        >
          <p className="legend" style={{ justifyContent: "center" }}>
            Ninguém palpitou neste jogo.
          </p>
        </div>
      ) : (
        <div className="alm-table-wrap">
          <table className="alm-table">
            <thead>
              <tr>
                <th className="l">Jogador</th>
                <th>Palpite</th>
                {finished && <th className="r">Pontos</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={me?.id === p.user.id ? "me" : ""}>
                  <td className="l">
                    <span className="name">{p.user.username}</span>
                  </td>
                  <td className="num">
                    {p.homeScore} × {p.awayScore}
                  </td>
                  {finished && (
                    <td className="r">
                      {p.points === 10 ? (
                        <span className="pts-badge exato">+10 cravou!</span>
                      ) : p.points === 5 ? (
                        <span className="pts-badge parcial">+5</span>
                      ) : (
                        <span className="pts-badge zero">0</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!finished && (
        <p
          className="legend"
          style={{ marginTop: 12, color: "var(--ink-faint)" }}
        >
          Os pontos aparecem aqui assim que o jogo for encerrado.
        </p>
      )}
    </>
  );
}
