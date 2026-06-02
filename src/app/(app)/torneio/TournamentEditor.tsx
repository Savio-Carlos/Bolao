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
}: {
  categories: CategoryMeta[];
  initial: EditorValues;
  teams: string[];
  open: boolean;
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
      setMsg("Palpites salvos! ✅");
      router.refresh();
    } else {
      setErr(data.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <p className="mb-3 text-sm text-neutral-500">
          🔒 Os palpites do torneio estão fechados — a Copa já começou. Estes
          são os seus:
        </p>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <div key={c.key} className="flex justify-between gap-2">
              <dt className="text-neutral-500">{c.label}</dt>
              <dd className="font-medium">{initial[c.key] || "—"}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Maior zebra</dt>
            <dd className="font-medium">
              {initial.upsetTeam
                ? `${initial.upsetTeam}${
                    initial.upsetStage
                      ? ` (${upsetStageLabel(initial.upsetStage)})`
                      : ""
                  }`
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <datalist id="teams-list">
        {teams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <label key={c.key} className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">
              {c.label}{" "}
              <span className="text-xs text-neutral-400">({c.points} pts)</span>
            </span>
            <input
              type="text"
              value={values[c.key]}
              onChange={(e) => set(c.key, e.target.value)}
              list={c.type === "team" ? "teams-list" : undefined}
              placeholder={
                c.type === "team" ? "escolha a seleção" : "digite o nome"
              }
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
            />
          </label>
        ))}
      </div>

      {/* Maior zebra: seleção + fase em que ela é eliminada */}
      <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
        <p className="mb-2 text-sm text-neutral-500">
          Maior zebra{" "}
          <span className="text-xs text-neutral-400">
            ({UPSET.teamPoints} pts pela seleção + {UPSET.stagePoints} pts pela
            fase — a fase só conta se a seleção estiver certa)
          </span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Seleção</span>
            <input
              type="text"
              value={values.upsetTeam}
              onChange={(e) => set("upsetTeam", e.target.value)}
              list="teams-list"
              placeholder="escolha a seleção"
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Para em qual fase</span>
            <select
              value={values.upsetStage}
              onChange={(e) => set("upsetStage", e.target.value)}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
            >
              <option value="">—</option>
              {UPSET_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar palpites da Copa"}
        </button>
      </div>
    </div>
  );
}
