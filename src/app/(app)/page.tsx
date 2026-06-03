import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayKey, formatDay, formatTime, isLive, statusLabel } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";
import { Crest } from "@/components/Crest";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];

function subtitle(m: Match): string {
  return groupLabel(m.group) ?? stageLabel(m.stage);
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
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });

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
      <Masthead />
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
