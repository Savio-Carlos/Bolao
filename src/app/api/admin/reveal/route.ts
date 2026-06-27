import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/admin/reveal  body: { revealed: boolean }
// Liga/desliga a revelação do ranking final (descongela o suspense das semis).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { revealed?: boolean };
  const revealed = Boolean(body.revealed);

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, rankingRevealed: revealed },
    update: { rankingRevealed: revealed },
  });

  return NextResponse.json({ ok: true, revealed });
}
