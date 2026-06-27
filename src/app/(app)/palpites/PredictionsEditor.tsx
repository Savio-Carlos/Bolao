"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay, formatTime } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";
import { Crest } from "@/components/Crest";
import { formatDuration } from "@/components/Countdown";

// Abaixo deste limiar mostramos a contagem regressiva ("Fecha em …") em vez de "Aberto".
const SOON_MS = 12 * 60 * 60 * 1000; // 12h

function DeadlinePill({ kickoff }: { kickoff: string }) {
  const targetMs = new Date(kickoff).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = targetMs - now;
  if (remaining <= 0) return <span className="pill closed">Fechado</span>;
  if (remaining <= SOON_MS)
    return (
      <span className="pill soon" suppressHydrationWarning>
        Fecha em {formatDuration(remaining)}
      </span>
    );
  return <span className="pill open">Aberto</span>;
}

export interface EditableMatch {
  matchId: number;
  stage: string;
  group: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoff: string; // ISO
  predHome: number | null;
  predAway: number | null;
  advancePick: "HOME" | "AWAY" | null; // só mata-mata
}

type Scores = Record<number, { home: string; away: string }>;
type Picks = Record<number, "HOME" | "AWAY" | "">;

export default function PredictionsEditor({
  matches,
}: {
  matches: EditableMatch[];
}) {
  const [scores, setScores] = useState<Scores>(() => {
    const init: Scores = {};
    for (const m of matches) {
      init[m.matchId] = {
        home: m.predHome?.toString() ?? "",
        away: m.predAway?.toString() ?? "",
      };
    }
    return init;
  });
  const [picks, setPicks] = useState<Picks>(() => {
    const init: Picks = {};
    for (const m of matches) init[m.matchId] = m.advancePick ?? "";
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(() => {
    const map: Scores = {};
    for (const m of matches) {
      map[m.matchId] = {
        home: m.predHome?.toString() ?? "",
        away: m.predAway?.toString() ?? "",
      };
    }
    return map;
  }, [matches]);

  const initialPicks = useMemo(() => {
    const map: Picks = {};
    for (const m of matches) map[m.matchId] = m.advancePick ?? "";
    return map;
  }, [matches]);

  const filledCount = matches.filter((m) => {
    const cur = scores[m.matchId];
    return cur.home !== "" && cur.away !== "";
  }).length;

  function setScore(matchId: number, side: "home" | "away", value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setScores((s) => ({ ...s, [matchId]: { ...s[matchId], [side]: clean } }));
  }

  // Alterna o palpite de quem avança; clicar no lado já marcado desfaz a escolha.
  function setPick(matchId: number, side: "HOME" | "AWAY") {
    setPicks((p) => ({ ...p, [matchId]: p[matchId] === side ? "" : side }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const toSave = matches.filter((m) => {
      const cur = scores[m.matchId];
      const ini = initial[m.matchId];
      const filled = cur.home !== "" && cur.away !== "";
      const scoreChanged = cur.home !== ini.home || cur.away !== ini.away;
      const ko = m.stage !== "GROUP_STAGE";
      const pickChanged = ko && picks[m.matchId] !== initialPicks[m.matchId];
      // O placar é sempre obrigatório p/ salvar; o "quem avança" vai junto.
      return filled && (scoreChanged || pickChanged);
    });

    if (toSave.length === 0) {
      setMessage("Nenhuma alteração para salvar.");
      setSaving(false);
      return;
    }

    let ok = 0;
    for (const m of toSave) {
      const cur = scores[m.matchId];
      const ko = m.stage !== "GROUP_STAGE";
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.matchId,
          homeScore: Number(cur.home),
          awayScore: Number(cur.away),
          advancePick: ko ? picks[m.matchId] || null : null,
        }),
      });
      if (res.ok) ok++;
    }

    if (ok === toSave.length) {
      setMessage(`${ok} palpite(s) salvo(s)! ✅`);
    } else {
      setError(
        `Salvei ${ok} de ${toSave.length}. Alguns jogos podem ter começado.`,
      );
    }
    setSaving(false);
  }

  return (
    <div>
      {matches.map((m) => {
        const kickoff = new Date(m.kickoff);
        return (
          <div className="pcard" key={m.matchId}>
            <div className="pc-top">
              <span className="pc-meta">
                {stageLabel(m.stage)}
                {m.group ? ` · ${groupLabel(m.group)}` : ""} ·{" "}
                <b>{formatTime(kickoff)}</b> · {formatDay(kickoff)}
              </span>
              <DeadlinePill kickoff={m.kickoff} />
            </div>
            <div className="pc-body">
              <div className="pteam right">
                <div>
                  <div className="nm">{m.homeTeam}</div>
                </div>
                <Crest src={m.homeCrest} size="sm" />
              </div>
              <div className="score-in">
                <input
                  className="sc-in"
                  inputMode="numeric"
                  maxLength={2}
                  value={scores[m.matchId].home}
                  onChange={(e) => setScore(m.matchId, "home", e.target.value)}
                  placeholder="–"
                  aria-label={`Gols ${m.homeTeam}`}
                />
                <span className="x">×</span>
                <input
                  className="sc-in"
                  inputMode="numeric"
                  maxLength={2}
                  value={scores[m.matchId].away}
                  onChange={(e) => setScore(m.matchId, "away", e.target.value)}
                  placeholder="–"
                  aria-label={`Gols ${m.awayTeam}`}
                />
              </div>
              <div className="pteam">
                <Crest src={m.awayCrest} size="sm" />
                <div>
                  <div className="nm">{m.awayTeam}</div>
                </div>
              </div>
            </div>
            {m.stage !== "GROUP_STAGE" && (
              <div className="pc-advance">
                <span className="adv-q">Quem avança?</span>
                <div className="adv-opts">
                  <button
                    type="button"
                    className={`adv-btn${picks[m.matchId] === "HOME" ? " on" : ""}`}
                    onClick={() => setPick(m.matchId, "HOME")}
                  >
                    {m.homeTeam}
                  </button>
                  <button
                    type="button"
                    className={`adv-btn${picks[m.matchId] === "AWAY" ? " on" : ""}`}
                    onClick={() => setPick(m.matchId, "AWAY")}
                  >
                    {m.awayTeam}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {message && (
        <p style={{ color: "var(--green)", fontFamily: "var(--ff-mono)", fontSize: 12 }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ color: "var(--red)", fontFamily: "var(--ff-mono)", fontSize: 12 }}>
          {error}
        </p>
      )}

      <div className="savebar">
        <span className="info">
          <b>{filledCount}</b> de {matches.length} palpite(s) preenchido(s)
        </span>
        <button className="btn gold" onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar palpites"}
        </button>
      </div>
    </div>
  );
}
