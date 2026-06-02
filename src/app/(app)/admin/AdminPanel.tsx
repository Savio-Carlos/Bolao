"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UPSET, UPSET_STAGES, type CategoryMeta } from "@/lib/tournament";

export interface AdminUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface ResultValues {
  champion: string;
  runnerUp: string;
  topScorer: string;
  bestPlayer: string;
  upsetTeam: string;
  upsetStage: string;
}

export default function AdminPanel({
  users,
  myId,
  matchCount,
  categories,
  resultInitial,
  teams,
}: {
  users: AdminUser[];
  myId: number;
  matchCount: number;
  categories: CategoryMeta[];
  resultInitial: ResultValues;
  teams: string[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ResultValues>(resultInitial);

  async function saveResult() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/tournament-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    const data = await res.json();
    if (res.ok) {
      flash(setMsg, `Gabarito salvo. ${data.updated} pontuação(ões) atualizada(s).`);
      router.refresh();
    } else {
      flash(setErr, data.error ?? "Erro ao salvar o gabarito.");
    }
    setBusy(false);
  }

  function flash(setter: (v: string | null) => void, text: string) {
    setter(text);
    setTimeout(() => setter(null), 4000);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newName }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewName("");
      flash(setMsg, `Usuário "${data.user.username}" criado.`);
      router.refresh();
    } else {
      flash(setErr, data.error ?? "Erro ao criar usuário.");
    }
    setBusy(false);
  }

  async function removeUser(id: number, name: string) {
    if (!confirm(`Remover "${name}"? Os palpites dele também serão apagados.`))
      return;
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) {
      flash(setMsg, "Usuário removido.");
      router.refresh();
    } else {
      flash(setErr, data.error ?? "Erro ao remover.");
    }
    setBusy(false);
  }

  async function sync() {
    setBusy(true);
    setErr(null);
    flash(setMsg, "Sincronizando jogos...");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      flash(
        setMsg,
        `Sincronizado: ${data.fetched} jogos, ${data.finished} encerrados, ${data.pointsUpdated} pontuações atualizadas.`,
      );
      router.refresh();
    } else {
      flash(setErr, data.error ?? "Erro ao sincronizar.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Jogos</h2>
        <p className="text-sm text-neutral-500">
          {matchCount} jogos no banco. A sincronização também roda
          automaticamente pelo agendador, mas você pode forçar agora.
        </p>
        <button
          onClick={sync}
          disabled={busy}
          className="self-start rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Sincronizar agora
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Gabarito da Copa</h2>
        <p className="text-sm text-neutral-500">
          Preencha o resultado oficial ao fim da Copa. Ao salvar, os pontos de
          bônus de todos os palpites são recalculados automaticamente.
        </p>
        <datalist id="gabarito-teams">
          {teams.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.key} className="flex flex-col gap-1">
              <span className="text-sm text-neutral-500">
                {c.label}{" "}
                <span className="text-xs text-neutral-400">
                  ({c.points} pts)
                </span>
              </span>
              <input
                type="text"
                value={result[c.key]}
                onChange={(e) =>
                  setResult((r) => ({ ...r, [c.key]: e.target.value }))
                }
                list={c.type === "team" ? "gabarito-teams" : undefined}
                placeholder="resultado oficial"
                className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">
              Maior zebra — seleção{" "}
              <span className="text-xs text-neutral-400">
                ({UPSET.teamPoints} pts)
              </span>
            </span>
            <input
              type="text"
              value={result.upsetTeam}
              onChange={(e) =>
                setResult((r) => ({ ...r, upsetTeam: e.target.value }))
              }
              list="gabarito-teams"
              placeholder="seleção zebra"
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">
              Maior zebra — fase{" "}
              <span className="text-xs text-neutral-400">
                ({UPSET.stagePoints} pts)
              </span>
            </span>
            <select
              value={result.upsetStage}
              onChange={(e) =>
                setResult((r) => ({ ...r, upsetStage: e.target.value }))
              }
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
        <button
          onClick={saveResult}
          disabled={busy}
          className="self-start rounded-lg bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          Salvar gabarito e recalcular
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Usuários ({users.length})</h2>
        <form onSubmit={addUser} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="nome do amigo"
            className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-green-600 dark:border-white/20"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            Cadastrar
          </button>
        </form>

        <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/5 dark:border-white/10">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <span>
                {u.username}
                {u.isAdmin && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    admin
                  </span>
                )}
              </span>
              {u.id !== myId && (
                <button
                  onClick={() => removeUser(u.id, u.username)}
                  disabled={busy}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
