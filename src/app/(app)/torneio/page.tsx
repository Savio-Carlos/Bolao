import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  SIMPLE_CATEGORIES,
  UPSET,
  normalize,
  tournamentDeadlineOpen,
  upsetStageLabel,
} from "@/lib/tournament";
import TournamentEditor, { type EditorValues } from "./TournamentEditor";

export const dynamic = "force-dynamic";

function zebraText(team: string | null, stage: string | null): string {
  if (!team) return "—";
  const label = upsetStageLabel(stage);
  return label ? `${team} (${label})` : team;
}

export default async function TorneioPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout já redireciona

  const [myBet, allBets, result, groupMatches, open] = await Promise.all([
    prisma.tournamentBet.findUnique({ where: { userId: user.id } }),
    prisma.tournamentBet.findMany({
      include: { user: { select: { username: true } } },
    }),
    prisma.tournamentResult.findUnique({ where: { id: 1 } }),
    prisma.match.findMany({
      where: { stage: "GROUP_STAGE" },
      select: { homeTeam: true, awayTeam: true },
    }),
    tournamentDeadlineOpen(),
  ]);

  const teams = [
    ...new Set(
      groupMatches
        .flatMap((m) => [m.homeTeam, m.awayTeam])
        .filter((t): t is string => !!t),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const initial: EditorValues = {
    champion: myBet?.champion ?? "",
    runnerUp: myBet?.runnerUp ?? "",
    topScorer: myBet?.topScorer ?? "",
    bestPlayer: myBet?.bestPlayer ?? "",
    upsetTeam: myBet?.upsetTeam ?? "",
    upsetStage: myBet?.upsetStage ?? "",
  };

  const ranked = [...allBets].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Palpites da Copa</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Palpites de longo prazo, valendo bônus pesado. Você pode editar{" "}
          <strong>até o início do primeiro jogo</strong>. Pontos:{" "}
          {SIMPLE_CATEGORIES.map((c) => `${c.label} ${c.points}`).join(" · ")} ·
          Maior zebra {UPSET.totalPoints} ({UPSET.teamPoints} seleção +{" "}
          {UPSET.stagePoints} fase).
        </p>
      </div>

      <TournamentEditor
        categories={SIMPLE_CATEGORIES}
        initial={initial}
        teams={teams}
        open={open}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Palpites de todos</h2>
        {ranked.length === 0 ? (
          <p className="text-sm text-neutral-500">Ninguém palpitou ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-left text-neutral-500 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2">Jogador</th>
                  {SIMPLE_CATEGORIES.map((c) => (
                    <th key={c.key} className="px-3 py-2 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 whitespace-nowrap">Maior zebra</th>
                  <th className="px-3 py-2 text-right">Bônus</th>
                </tr>
              </thead>
              <tbody>
                {result && (
                  <tr className="border-t border-black/5 bg-amber-50 font-medium dark:border-white/5 dark:bg-amber-950/30">
                    <td className="px-3 py-2">✅ Gabarito</td>
                    {SIMPLE_CATEGORIES.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {(result[c.key] as string | null) ?? "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {zebraText(result.upsetTeam, result.upsetStage)}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                )}
                {ranked.map((bet) => {
                  const zebraHit =
                    result?.upsetTeam &&
                    normalize(bet.upsetTeam) === normalize(result.upsetTeam);
                  return (
                    <tr
                      key={bet.id}
                      className={`border-t border-black/5 dark:border-white/5 ${
                        bet.userId === user.id
                          ? "bg-green-50 dark:bg-green-950/30"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {bet.user.username}
                      </td>
                      {SIMPLE_CATEGORIES.map((c) => {
                        const val = (bet[c.key] as string | null) ?? "";
                        const official = result
                          ? (result[c.key] as string | null)
                          : null;
                        const hit =
                          official && normalize(val) === normalize(official);
                        return (
                          <td
                            key={c.key}
                            className={`px-3 py-2 ${
                              hit
                                ? "font-semibold text-green-700 dark:text-green-400"
                                : ""
                            }`}
                          >
                            {val || "—"}
                          </td>
                        );
                      })}
                      <td
                        className={`px-3 py-2 ${
                          zebraHit
                            ? "font-semibold text-green-700 dark:text-green-400"
                            : ""
                        }`}
                      >
                        {zebraText(bet.upsetTeam, bet.upsetStage)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">
                        {bet.points ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
