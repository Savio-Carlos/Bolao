import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  dayKey,
  formatDay,
  formatTime,
  inLiveWindow,
  isLive,
  statusLabel,
} from "@/lib/format";
import { groupLabel, stageLabel, isOpenForPrediction } from "@/lib/football/types";
import { getCurrentUser } from "@/lib/session";
import { computeRanking } from "@/lib/ranking";
import { Crest } from "@/components/Crest";
import { Countdown } from "@/components/Countdown";
import { LiveRefresh } from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];

function subtitle(m: Match): string {
  return groupLabel(m.group) ?? stageLabel(m.stage);
}

function StatusStrip({
  position,
  totalPlayers,
  total,
  exact,
  partial,
  nextMatch,
}: {
  position: number | null;
  totalPlayers: number;
  total: number;
  exact: number;
  partial: number;
  nextMatch: Match | null;
}) {
  if (position === null && !nextMatch) return null;
  const single = position === null || !nextMatch;
  return (
    <section
      className="strip"
      style={single ? { gridTemplateColumns: "1fr" } : undefined}
    >
      {position !== null && (
        <div className="ticket">
          <div className="medal">{position}º</div>
          <div>
            <p className="label">Sua posição no bolão</p>
            <p className="big">
              {position}º <small>de {totalPlayers} jogadores</small>
            </p>
            <div className="ticket-meta">
              <span>
                <b>{total}</b> pts
              </span>
              <span>
                <b>{exact}</b> exatos
              </span>
              <span>
                <b>{partial}</b> parciais
              </span>
            </div>
          </div>
        </div>
      )}
      {nextMatch && (
        <div className="ticket next">
          <div>
            <p className="label">Próximo a fechar palpite</p>
            <div className="match-line">
              <Crest src={nextMatch.homeCrest} size="sm" />
              <span className="nm">{nextMatch.homeTeam}</span>
              <span className="vs">×</span>
              <span className="nm">{nextMatch.awayTeam}</span>
              <Crest src={nextMatch.awayCrest} size="sm" />
            </div>
            <p className="countdown">
              ⏱ FECHA EM{" "}
              <Countdown target={nextMatch.kickoff.toISOString()} />
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-top">
        <span className="rule" />
        <span>
          <span className="star">★</span> Almanaque do Mundial · Nº 01{" "}
          <span className="star">★</span>
        </span>
        <span className="rule" />
      </div>
      <div className="masthead-main">
        <div className="seal">
          <div className="seal-core">
            <div className="seal-text">
              Copa<b>26</b>Mundial
            </div>
          </div>
        </div>
        <div className="title-block">
          <p className="kicker">Edição 2026 · Junho — Julho</p>
          <h1>
            Bolão da <em>Copa</em>
          </h1>
          <p className="sub">
            canadá · méxico · estados unidos — 48 seleções, um campeão
          </p>
        </div>
        <div className="seal">
          <div className="seal-core">
            <div className="seal-text">
              48<b>★</b>Times
            </div>
          </div>
        </div>
      </div>
      <div className="rule-double" />
    </header>
  );
}

function FeaturedMatch({ m, num }: { m: Match; num: number }) {
  const decided = m.homeScore !== null && m.awayScore !== null;
  return (
    <article className="featured">
      <div className="feat-top">
        <span className="feat-stage">
          <span className="star">★</span> {stageLabel(m.stage)}
          {m.group ? ` · ${groupLabel(m.group)}` : ""}
        </span>
        {isLive(m.status) ? (
          <span className="live">
            <span className="dot" /> {statusLabel(m.status)}
          </span>
        ) : (
          <span className="feat-stage">Jogo Nº {num}</span>
        )}
      </div>
      <div className="feat-body">
        <div className="team">
          <Crest src={m.homeCrest} />
          <div>
            <div className="tname">{m.homeTeam ?? "A definir"}</div>
            <div className="tsub">{subtitle(m)}</div>
          </div>
        </div>
        <div className="scorebox">
          <div className="sc">
            {decided ? (
              <>
                <span>{m.homeScore}</span>
                <span className="x">×</span>
                <span>{m.awayScore}</span>
              </>
            ) : (
              <span className="x">×</span>
            )}
          </div>
          <div className="min">{statusLabel(m.status)}</div>
        </div>
        <div className="team right">
          <Crest src={m.awayCrest} />
          <div>
            <div className="tname">{m.awayTeam ?? "A definir"}</div>
            <div className="tsub">{subtitle(m)}</div>
          </div>
        </div>
      </div>
      <div className="feat-foot">
        <span className="stadium">
          <span className="pin">⚑</span> {formatDay(m.kickoff)} ·{" "}
          {formatTime(m.kickoff)}
        </span>
        <Link className="foot-link" href={`/jogos/${m.id}`}>
          Ver palpites →
        </Link>
      </div>
    </article>
  );
}

function MatchCard({ m, num }: { m: Match; num: number }) {
  const decided = m.homeScore !== null && m.awayScore !== null;
  const live = isLive(m.status);
  const finished = m.status === "FINISHED";
  return (
    <Link className="card" href={`/jogos/${m.id}`}>
      <span className="card-num">Nº {String(num).padStart(2, "0")}</span>
      <div className="card-top">
        <span className="stage">
          {stageLabel(m.stage)}
          {m.group ? ` · ${groupLabel(m.group)}` : ""}
        </span>
        <span
          className={`status ${
            live ? "livetag" : finished ? "done" : "time"
          }`}
        >
          {finished || live ? statusLabel(m.status) : formatTime(m.kickoff)}
        </span>
      </div>
      <div className="card-body">
        <div className="ct">
          <Crest src={m.homeCrest} size="sm" />
          <span className="nm">{m.homeTeam ?? "A definir"}</span>
        </div>
        <div className={`csc${decided ? "" : " pending"}`}>
          {decided ? (
            <>
              <span>{m.homeScore}</span>
              <span className="x">×</span>
              <span>{m.awayScore}</span>
            </>
          ) : (
            "×"
          )}
        </div>
        <div className="ct right">
          <Crest src={m.awayCrest} size="sm" />
          <span className="nm">{m.awayTeam ?? "A definir"}</span>
        </div>
      </div>
      <div className="card-foot" style={{ justifyContent: "flex-end" }}>
        <span className="foot-link">ver palpites →</span>
      </div>
    </Link>
  );
}

export default async function CronogramaPage() {
  const [matches, me, users, predictions, tournamentBets] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { username: "asc" } }),
    prisma.prediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
    prisma.tournamentBet.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
  ]);

  // Posição do usuário no ranking geral (reaproveita a mesma lógica da página de Ranking).
  const ranking = computeRanking(users, predictions, tournamentBets);
  const meIndex = me ? ranking.findIndex((r) => r.user.id === me.id) : -1;
  const meRow = meIndex >= 0 ? ranking[meIndex] : null;

  // Próximo jogo a fechar (matches já vem em ordem cronológica).
  const nextMatch = matches.find((m) => isOpenForPrediction(m)) ?? null;
  // Auto-refresh enquanto houver jogo ao vivo OU na janela em que deveria estar
  // rolando — assim a home puxa sozinha o placar/encerramento do sync mais novo.
  const hasLive = matches.some((m) => isLive(m.status) || inLiveWindow(m));

  if (matches.length === 0) {
    return (
      <>
        <Masthead />
        <div className="alm-table-wrap" style={{ padding: "32px", textAlign: "center" }}>
          <p className="legend" style={{ justifyContent: "center" }}>
            Nenhum jogo carregado ainda. Um admin precisa sincronizar os jogos na
            área de <b>Admin</b>.
          </p>
        </div>
      </>
    );
  }

  const numberById = new Map(matches.map((m, i) => [m.id, i + 1]));

  // Agrupa por dia (fuso de Brasília), mantendo a ordem cronológica.
  const days = new Map<string, Match[]>();
  for (const m of matches) {
    const key = dayKey(m.kickoff);
    if (!days.has(key)) days.set(key, []);
    days.get(key)!.push(m);
  }

  return (
    <>
      {hasLive && <LiveRefresh />}
      <Masthead />
      <StatusStrip
        position={meRow ? meIndex + 1 : null}
        totalPlayers={ranking.length}
        total={meRow?.total ?? 0}
        exact={meRow?.exact ?? 0}
        partial={meRow?.partial ?? 0}
        nextMatch={nextMatch}
      />
      {[...days.entries()].map(([key, dayMatches]) => {
        const liveOnes = dayMatches.filter((m) => isLive(m.status));
        const rest = dayMatches.filter((m) => !isLive(m.status));
        return (
          <section key={key}>
            <div className="section-head">
              <h2>
                <span className="star">★</span> {formatDay(dayMatches[0].kickoff)}
              </h2>
              <span className="bar" />
              <span className="daytag">{dayMatches.length} jogos</span>
            </div>

            {liveOnes.map((m) => (
              <FeaturedMatch key={m.id} m={m} num={numberById.get(m.id)!} />
            ))}

            {rest.length > 0 && (
              <div className="day-block">
                <div className="cards">
                  {rest.map((m) => (
                    <MatchCard key={m.id} m={m} num={numberById.get(m.id)!} />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
