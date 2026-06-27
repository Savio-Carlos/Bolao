import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SIMPLE_CATEGORIES, getFreezeState } from "@/lib/tournament";
import AdminPanel, { type AdminUser, type ResultValues } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/");

  const [users, matchCount, result, groupMatches, freeze] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.match.count(),
    prisma.tournamentResult.findUnique({ where: { id: 1 } }),
    prisma.match.findMany({
      where: { stage: "GROUP_STAGE" },
      select: { homeTeam: true, awayTeam: true },
    }),
    getFreezeState(),
  ]);

  const list: AdminUser[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    isAdmin: u.isAdmin,
  }));

  const teams = [
    ...new Set(
      groupMatches
        .flatMap((m) => [m.homeTeam, m.awayTeam])
        .filter((t): t is string => !!t),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const resultInitial: ResultValues = {
    champion: result?.champion ?? "",
    runnerUp: result?.runnerUp ?? "",
    topScorer: result?.topScorer ?? "",
    bestPlayer: result?.bestPlayer ?? "",
    upsetTeam: result?.upsetTeam ?? "",
    upsetStage: result?.upsetStage ?? "",
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="page-head">
        <p className="kicker">★ Bastidores do bolão</p>
        <h1>
          O <em>Admin</em>
        </h1>
        <div className="page-rule" />
      </header>
      <AdminPanel
        users={list}
        myId={me.id}
        matchCount={matchCount}
        categories={SIMPLE_CATEGORIES}
        resultInitial={resultInitial}
        teams={teams}
        revealed={freeze.revealed}
        semisStarted={freeze.started}
      />
    </div>
  );
}
