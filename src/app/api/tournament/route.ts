import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  TOURNAMENT_CATEGORIES,
  tournamentDeadlineOpen,
  type TournamentKey,
} from "@/lib/tournament";

export const dynamic = "force-dynamic";

// POST /api/tournament — salva os palpites de torneio do usuário logado.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!(await tournamentDeadlineOpen())) {
    return NextResponse.json(
      { error: "Os palpites do torneio já estão fechados (a Copa começou)." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<TournamentKey, string | null> = {} as Record<
    TournamentKey,
    string | null
  >;
  for (const cat of TOURNAMENT_CATEGORIES) {
    const raw = body[cat.key];
    const value = typeof raw === "string" ? raw.trim().slice(0, 80) : "";
    data[cat.key] = value === "" ? null : value;
  }

  await prisma.tournamentBet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
