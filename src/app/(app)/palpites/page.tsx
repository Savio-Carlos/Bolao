import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isOpenForPrediction } from "@/lib/football/types";
import PredictionsEditor, { type EditableMatch } from "./PredictionsEditor";

export const dynamic = "force-dynamic";

export default async function PalpitesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout já redireciona

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
  ]);

  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const open: EditableMatch[] = matches
    .filter((m) => isOpenForPrediction(m))
    .map((m) => {
      const p = predByMatch.get(m.id);
      return {
        matchId: m.id,
        stage: m.stage,
        group: m.group,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeCrest: m.homeCrest,
        awayCrest: m.awayCrest,
        kickoff: m.kickoff.toISOString(),
        predHome: p?.homeScore ?? null,
        predAway: p?.awayScore ?? null,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Meus palpites</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Você pode editar até o início de cada jogo. Pontuação: 10 pontos pelo
          placar exato, 5 por acertar quem ganha (ou empate).
        </p>
      </div>
      {open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-neutral-500 dark:border-white/15">
          Nenhum jogo aberto para palpite no momento.
        </div>
      ) : (
        <PredictionsEditor matches={open} />
      )}
    </div>
  );
}
