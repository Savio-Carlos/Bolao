import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDay, formatTime, isLive, statusLabel } from "@/lib/format";
import { groupLabel, stageLabel } from "@/lib/football/types";

export const dynamic = "force-dynamic";

function Team({
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
        <img src={crest} alt="" className="h-6 w-6 object-contain" />
      ) : (
        <span className="inline-block h-6 w-6 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      )}
      <span className="font-semibold">{name ?? "A definir"}</span>
    </div>
  );
}

export default async function JogoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) notFound();

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, username: true } } },
  });

  const finished = match.status === "FINISHED";
  const decided = match.homeScore !== null && match.awayScore !== null;

  // Ordena: maior pontuação primeiro (quando encerrado), depois por nome.
  const rows = [...predictions].sort(
    (a, b) =>
      (b.points ?? -1) - (a.points ?? -1) ||
      a.user.username.localeCompare(b.user.username, "pt-BR"),
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-neutral-500 hover:text-green-600">
        ← voltar aos jogos
      </Link>

      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {stageLabel(match.stage)}
            {match.group ? ` · ${groupLabel(match.group)}` : ""}
          </span>
          <span className={isLive(match.status) ? "font-semibold text-red-600" : ""}>
            {finished || isLive(match.status)
              ? statusLabel(match.status)
              : `${formatDay(match.kickoff)} · ${formatTime(match.kickoff)}`}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Team name={match.homeTeam} crest={match.homeCrest} />
          <div className="min-w-16 text-center text-2xl font-bold tabular-nums">
            {decided ? `${match.homeScore} × ${match.awayScore}` : "—"}
          </div>
          <Team name={match.awayTeam} crest={match.awayCrest} align="right" />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Palpites de todos</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Ninguém palpitou neste jogo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-left text-neutral-500 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2">Jogador</th>
                  <th className="px-3 py-2 text-center">Palpite</th>
                  {finished && <th className="px-3 py-2 text-right">Pontos</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-black/5 dark:border-white/5 ${
                      me?.id === p.user.id
                        ? "bg-green-50 dark:bg-green-950/30"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{p.user.username}</td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {p.homeScore} × {p.awayScore}
                    </td>
                    {finished && (
                      <td className="px-3 py-2 text-right">
                        {p.points === 10 ? (
                          <span className="font-bold text-green-700 dark:text-green-400">
                            Cravou! +10
                          </span>
                        ) : p.points === 5 ? (
                          <span className="font-semibold text-green-600">
                            +5
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!finished && (
          <p className="text-xs text-neutral-400">
            Os pontos aparecem aqui assim que o jogo for encerrado.
          </p>
        )}
      </section>
    </div>
  );
}
