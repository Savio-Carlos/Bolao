"use client";

import { useMemo, useState } from "react";
import { formatDay, formatTime } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";

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
}

type Scores = Record<number, { home: string; away: string }>;

function Crest({ src }: { src: string | null }) {
  if (!src)
    return (
      <span className="inline-block h-5 w-5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-5 w-5 shrink-0 object-contain" />;
}

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

  function setScore(matchId: number, side: "home" | "away", value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setScores((s) => ({ ...s, [matchId]: { ...s[matchId], [side]: clean } }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const toSave = matches.filter((m) => {
      const cur = scores[m.matchId];
      const ini = initial[m.matchId];
      const filled = cur.home !== "" && cur.away !== "";
      const changed = cur.home !== ini.home || cur.away !== ini.away;
      return filled && changed;
    });

    if (toSave.length === 0) {
      setMessage("Nenhuma alteração para salvar.");
      setSaving(false);
      return;
    }

    let ok = 0;
    for (const m of toSave) {
      const cur = scores[m.matchId];
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.matchId,
          homeScore: Number(cur.home),
          awayScore: Number(cur.away),
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
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {matches.map((m) => (
          <li
            key={m.matchId}
            className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
          >
            <div className="mb-2 text-xs text-neutral-500">
              {stageLabel(m.stage)}
              {m.group ? ` · ${groupLabel(m.group)}` : ""} ·{" "}
              {formatDay(new Date(m.kickoff))} às {formatTime(new Date(m.kickoff))}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 items-center justify-end gap-2">
                <span className="truncate font-medium">{m.homeTeam}</span>
                <Crest src={m.homeCrest} />
              </div>
              <div className="flex items-center gap-1">
                <input
                  inputMode="numeric"
                  value={scores[m.matchId].home}
                  onChange={(e) => setScore(m.matchId, "home", e.target.value)}
                  className="h-10 w-12 rounded-lg border border-black/15 bg-transparent text-center text-lg outline-none focus:border-green-600 dark:border-white/20"
                  placeholder="-"
                />
                <span className="text-neutral-400">×</span>
                <input
                  inputMode="numeric"
                  value={scores[m.matchId].away}
                  onChange={(e) => setScore(m.matchId, "away", e.target.value)}
                  className="h-10 w-12 rounded-lg border border-black/15 bg-transparent text-center text-lg outline-none focus:border-green-600 dark:border-white/20"
                  placeholder="-"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Crest src={m.awayCrest} />
                <span className="truncate font-medium">{m.awayTeam}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white shadow-lg transition hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar palpites"}
        </button>
      </div>
    </div>
  );
}
