import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isOpenForPrediction } from "@/lib/football/types";

export const dynamic = "force-dynamic";

// POST /api/predictions  body: { matchId, homeScore, awayScore }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    matchId?: number;
    homeScore?: number;
    awayScore?: number;
  };
  const matchId = Number(body.matchId);
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);

  if (
    !matchId ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 99 ||
    awayScore > 99
  ) {
    return NextResponse.json({ error: "Palpite inválido." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
  }
  if (!isOpenForPrediction(match)) {
    return NextResponse.json(
      { error: "Este jogo não está mais aberto para palpites." },
      { status: 403 },
    );
  }

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    create: { userId: user.id, matchId, homeScore, awayScore },
    update: { homeScore, awayScore },
  });

  return NextResponse.json({ ok: true });
}
