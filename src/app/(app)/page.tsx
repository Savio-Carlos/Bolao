import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayKey, formatDay, formatTime, isLive, statusLabel } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";

export const dynamic = "force-dynamic";

function TeamBadge({
  name,
  crest,
  align = "left",
}: {
  name: string | null;
  crest: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-5 w-5 object-contain" />
      ) : (
        <span className="inline-block h-5 w-5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      )}
      <span className="font-medium">{name ?? "A definir"}</span>
    </div>
  );
}

export default async function CronogramaPage() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-neutral-500 dark:border-white/15">
        Nenhum jogo carregado ainda. Um admin precisa sincronizar os jogos na
        área de <strong>Admin</strong>.
      </div>
    );
  }

  // Agrupa por dia (fuso de Brasília), mantendo a ordem cronológica.
  const days = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = dayKey(m.kickoff);
    if (!days.has(key)) days.set(key, []);
    days.get(key)!.push(m);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Jogos</h1>
      {[...days.entries()].map(([key, dayMatches]) => (
        <section key={key}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {formatDay(dayMatches[0].kickoff)}
          </h2>
          <ul className="flex flex-col gap-2">
            {dayMatches.map((m) => {
              const decided = m.homeScore !== null && m.awayScore !== null;
              return (
                <li key={m.id}>
                  <Link
                    href={`/jogos/${m.id}`}
                    className="block rounded-xl border border-black/10 bg-white p-3 transition hover:border-green-600/60 dark:border-white/10 dark:bg-neutral-900"
                  >
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {stageLabel(m.stage)}
                      {m.group ? ` · ${groupLabel(m.group)}` : ""}
                    </span>
                    <span
                      className={
                        isLive(m.status)
                          ? "font-semibold text-red-600"
                          : m.status === "FINISHED"
                            ? "text-neutral-400"
                            : ""
                      }
                    >
                      {m.status === "FINISHED" || isLive(m.status)
                        ? statusLabel(m.status)
                        : formatTime(m.kickoff)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TeamBadge name={m.homeTeam} crest={m.homeCrest} />
                    <div className="min-w-14 text-center text-lg font-bold tabular-nums">
                      {decided ? `${m.homeScore} × ${m.awayScore}` : "—"}
                    </div>
                    <TeamBadge
                      name={m.awayTeam}
                      crest={m.awayCrest}
                      align="right"
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-neutral-400">
                    ver palpites →
                  </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
