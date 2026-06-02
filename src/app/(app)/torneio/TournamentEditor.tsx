"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryMeta, TournamentKey } from "@/lib/tournament";

export default function TournamentEditor({
  categories,
  initial,
  teams,
  open,
}: {
  categories: CategoryMeta[];
  initial: Record<TournamentKey, string>;
  teams: string[];
  open: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<TournamentKey, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set(key: TournamentKey, value: string) {
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
              placeholder={c.type === "team" ? "escolha a seleção" : "digite o nome"}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
            />
          </label>
        ))}
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
