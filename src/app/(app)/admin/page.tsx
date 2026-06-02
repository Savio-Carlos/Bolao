import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  TOURNAMENT_CATEGORIES,
  type TournamentKey,
} from "@/lib/tournament";
import AdminPanel, { type AdminUser } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/");

  const [users, matchCount, result] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.match.count(),
    prisma.tournamentResult.findUnique({ where: { id: 1 } }),
  ]);

  const list: AdminUser[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    isAdmin: u.isAdmin,
  }));

  const resultInitial = Object.fromEntries(
    TOURNAMENT_CATEGORIES.map((c) => [
      c.key,
      (result?.[c.key] as string | null) ?? "",
    ]),
  ) as Record<TournamentKey, string>;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <AdminPanel
        users={list}
        myId={me.id}
        matchCount={matchCount}
        categories={TOURNAMENT_CATEGORIES}
        resultInitial={resultInitial}
      />
    </div>
  );
}
