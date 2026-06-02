import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  ALL_KEYS,
  gradeTournamentBet,
  type TournamentFields,
} from "@/lib/tournament";

export const dynamic = "force-dynamic";

// POST /api/admin/tournament-result — admin grava o gabarito oficial e recalcula
// os pontos de todos os palpites de torneio.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data = {} as TournamentFields;
  for (const key of ALL_KEYS) {
    const raw = body[key];
    const value = typeof raw === "string" ? raw.trim().slice(0, 80) : "";
    data[key] = value === "" ? null : value;
  }

  const result = await prisma.tournamentResult.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  // Recalcula a pontuação de todos os palpites com o novo gabarito.
  const bets = await prisma.tournamentBet.findMany();
  let updated = 0;
  for (const bet of bets) {
    const points = gradeTournamentBet(bet, result);
    if (bet.points !== points) {
      await prisma.tournamentBet.update({
        where: { id: bet.id },
        data: { points },
      });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, updated });
}
