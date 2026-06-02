import Link from "next/link";
import { prisma } from "@/lib/db";
import { isLive, statusLabel } from "@/lib/format";
import { groupLabel, stageLabel, stageRank } from "@/lib/football/types";
import { computeGroupStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

type Match = Awaited<ReturnType<typeof prisma.match.findMany>>[number];

function BracketTeam({
  name,
  crest,
  score,
  bold,
}: {
  name: string | null;
  crest: string | null;
  score: number | null;
  bold: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-4 w-4 shrink-0 object-contain" />
      ) : (
        <span className="inline-block h-4 w-4 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      )}
      <span className={`flex-1 truncate ${bold ? "font-bold" : ""}`}>
        {name ?? "A definir"}
      </span>
      {score !== null && (
        <span className="tabular-nums text-neutral-500">{score}</span>
      )}
    </div>
  );
}

export default async function ClassificacaoPage() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Classificação</h1>
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-neutral-500 dark:border-white/15">
          Nenhum jogo carregado ainda. Um admin precisa sincronizar os jogos na
          área de <strong>Admin</strong>.
        </div>
      </div>
    );
  }

  const standings = computeGroupStandings(matches);

  // Mata-mata agrupado por fase, em ordem.
  const knockout = matches.filter((m) => m.stage !== "GROUP_STAGE");
  const stages = [...new Set(knockout.map((m) => m.stage))].sort(
    (a, b) => stageRank(a) - stageRank(b),
  );
  const byStage = new Map<string, Match[]>();
  for (const m of knockout) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-bold">Classificação</h1>

      {/* Fase de grupos */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Fase de grupos</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {standings.map(({ group, rows }) => (
            <div
              key={group}
              className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
            >
              <div className="bg-neutral-100 px-3 py-2 text-sm font-semibold dark:bg-neutral-800">
                {groupLabel(group)}
              </div>
              <table className="w-full text-xs">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">#</th>
                    <th className="px-1 py-1 text-left font-medium">Seleção</th>
                    <th className="px-1 py-1 text-center font-medium">P</th>
                    <th className="px-1 py-1 text-center font-medium">J</th>
                    <th className="px-1 py-1 text-center font-medium">V</th>
                    <th className="px-1 py-1 text-center font-medium">E</th>
                    <th className="px-1 py-1 text-center font-medium">D</th>
                    <th className="px-2 py-1 text-center font-medium">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.team}
                      className={`border-t border-black/5 dark:border-white/5 ${
                        i < 2
                          ? "bg-green-50 dark:bg-green-950/30"
                          : i === 2
                            ? "bg-amber-50 dark:bg-amber-950/20"
                            : ""
                      }`}
                    >
                      <td className="px-2 py-1 text-neutral-400">{i + 1}</td>
                      <td className="px-1 py-1 font-medium">{r.team}</td>
                      <td className="px-1 py-1 text-center font-bold tabular-nums">
                        {r.points}
                      </td>
                      <td className="px-1 py-1 text-center tabular-nums">
                        {r.played}
                      </td>
                      <td className="px-1 py-1 text-center tabular-nums">
                        {r.won}
                      </td>
                      <td className="px-1 py-1 text-center tabular-nums">
                        {r.drawn}
                      </td>
                      <td className="px-1 py-1 text-center tabular-nums">
                        {r.lost}
                      </td>
                      <td className="px-2 py-1 text-center tabular-nums">
                        {r.gd > 0 ? `+${r.gd}` : r.gd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400 align-middle" />{" "}
          1º e 2º classificam direto ·{" "}
          <span className="inline-block h-2 w-2 rounded-full bg-amber-300 align-middle" />{" "}
          os 8 melhores 3ºs também avançam. Critérios: pontos → saldo → gols pró.
        </p>
      </section>

      {/* Mata-mata */}
      {stages.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Mata-mata</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stages.map((stage) => (
              <div key={stage} className="flex w-56 shrink-0 flex-col gap-2">
                <h3 className="text-sm font-semibold text-neutral-500">
                  {stageLabel(stage)}
                </h3>
                {byStage.get(stage)!.map((m) => {
                  const decided =
                    m.homeScore !== null && m.awayScore !== null;
                  const homeWin = decided && m.homeScore! > m.awayScore!;
                  const awayWin = decided && m.awayScore! > m.homeScore!;
                  return (
                    <Link
                      key={m.id}
                      href={`/jogos/${m.id}`}
                      className="flex flex-col gap-1 rounded-lg border border-black/10 bg-white p-2 text-sm transition hover:border-green-600/60 dark:border-white/10 dark:bg-neutral-900"
                    >
                      <BracketTeam
                        name={m.homeTeam}
                        crest={m.homeCrest}
                        score={m.homeScore}
                        bold={homeWin}
                      />
                      <BracketTeam
                        name={m.awayTeam}
                        crest={m.awayCrest}
                        score={m.awayScore}
                        bold={awayWin}
                      />
                      <span
                        className={`text-[10px] ${
                          isLive(m.status)
                            ? "font-semibold text-red-600"
                            : "text-neutral-400"
                        }`}
                      >
                        {statusLabel(m.status)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
