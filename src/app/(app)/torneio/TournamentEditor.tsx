"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UPSET,
  UPSET_STAGES,
  upsetStageLabel,
  type CategoryMeta,
} from "@/lib/tournament";

export interface EditorValues {
  champion: string;
  runnerUp: string;
  topScorer: string;
  bestPlayer: string;
  upsetTeam: string;
  upsetStage: string;
}

export default function TournamentEditor({
  categories,
  initial,
  teams,
  open,
  deadlineLabel,
}: {
  categories: CategoryMeta[];
  initial: EditorValues;
  teams: string[];
  open: boolean;
  deadlineLabel: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<EditorValues>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set(key: keyof EditorValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Cartela salva! ✅");
      router.refresh();
    } else {
      setErr(data.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  const byKey = (k: CategoryMeta["key"]) => categories.find((c) => c.key === k);
  const champion = byKey("champion");
  const gridCats = categories.filter((c) => c.key !== "champion");
  const jersey: Partial<Record<CategoryMeta["key"], string>> = {
    topScorer: "9",
    bestPlayer: "10",
  };

  if (!open) {
    return (
      <div className="pcard locked">
        <div className="pc-top">
          <span className="pc-meta">
            🔒 Os palpites do torneio estão fechados — o mata-mata já começou
          </span>
          <span className="pill closed">Encerrado</span>
        </div>
        <div className="bonus-grid">
          {categories.map((c) => (
            <div className="bcard" key={c.key}>
              <div className="label">
                <span>{c.label}</span>
                <span className="bpts">+{c.points}</span>
              </div>
              <span style={{ fontFamily: "var(--ff-serif)", fontSize: 21 }}>
                {initial[c.key] || "—"}
              </span>
            </div>
          ))}
          <div className="bcard">
            <div className="label">
              <span>Maior zebra</span>
              <span className="bpts">+{UPSET.totalPoints}</span>
            </div>
            <span style={{ fontFamily: "var(--ff-serif)", fontSize: 21 }}>
              {initial.upsetTeam
                ? `${initial.upsetTeam}${
                    initial.upsetStage
                      ? ` (${upsetStageLabel(initial.upsetStage)})`
                      : ""
                  }`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="deadline">
        <span className="dot" /> A cartela fecha{" "}
        <b>no início do mata-mata{deadlineLabel ? ` — ${deadlineLabel}` : ""}</b>{" "}
        — depois, é torcer.
      </div>

      <datalist id="teams-list">
        {teams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* CAMPEÃO (hero) */}
      {champion && (
        <div className="bonus-hero">
          <div className="trophy">🏆</div>
          <div className="bh-mid">
            <p className="label">Campeão do mundo</p>
            <div className="pick-row">
              <div className="sel-wrap">
                <input
                  className="sel"
                  list="teams-list"
                  value={values.champion}
                  onChange={(e) => set("champion", e.target.value)}
                  placeholder="escolha a seleção"
                />
              </div>
            </div>
          </div>
          <span className="bpts">+{champion.points} pts</span>
        </div>
      )}

      <div className="bonus-grid">
        {gridCats.map((c) => (
          <div className="bcard" key={c.key}>
            <div className="label">
              <span>{c.label}</span>
              <span className="bpts">+{c.points}</span>
            </div>
            <div className="pick-row">
              {jersey[c.key] && (
                <span
                  className="jersey"
                  style={
                    c.key === "bestPlayer"
                      ? { background: "var(--gold)", color: "var(--green-deep)" }
                      : undefined
                  }
                >
                  {jersey[c.key]}
                </span>
              )}
              <div
                className={`sel-wrap${c.type === "team" ? "" : " plain"}`}
              >
                <input
                  className="sel sm"
                  list={c.type === "team" ? "teams-list" : undefined}
                  value={values[c.key]}
                  onChange={(e) => set(c.key, e.target.value)}
                  placeholder={
                    c.type === "team" ? "escolha a seleção" : "digite o nome"
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {/* MAIOR ZEBRA */}
        <div className="bcard">
          <div className="label">
            <span>Maior zebra</span>
            <span className="bpts">+{UPSET.totalPoints}</span>
          </div>
          <div className="zebra-row">
            <div className="sel-wrap">
              <input
                className="sel sm"
                list="teams-list"
                value={values.upsetTeam}
                onChange={(e) => set("upsetTeam", e.target.value)}
                placeholder="seleção"
              />
            </div>
            <div className="sel-wrap">
              <select
                className="sel sm"
                value={values.upsetStage}
                onChange={(e) => set("upsetStage", e.target.value)}
              >
                <option value="">para em…</option>
                {UPSET_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--ff-mono)",
              fontSize: 10,
              color: "var(--ink-faint)",
            }}
          >
            {UPSET.teamPoints} pts pela seleção + {UPSET.stagePoints} pela fase
            (só conta se a seleção estiver certa).
          </span>
        </div>
      </div>

      {msg && (
        <p style={{ color: "var(--green)", fontFamily: "var(--ff-mono)", fontSize: 12, marginTop: 12 }}>
          {msg}
        </p>
      )}
      {err && (
        <p style={{ color: "var(--red)", fontFamily: "var(--ff-mono)", fontSize: 12, marginTop: 12 }}>
          {err}
        </p>
      )}

      <div className="savebar" style={{ position: "static", marginTop: 16 }}>
        <span className="info">
          Sua cartela: <b>{values.champion || "—"}</b> campeão,{" "}
          <b>{values.runnerUp || "—"}</b> vice · zebra{" "}
          <b>{values.upsetTeam || "—"}</b>
        </span>
        <button className="btn gold" onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar cartela"}
        </button>
      </div>
    </div>
  );
}
