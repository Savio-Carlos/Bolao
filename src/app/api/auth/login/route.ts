import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/auth/login  body: { username }
// Só loga usuários que já existem (o admin cadastra antes em /admin).
export async function POST(req: Request) {
  const { username } = (await req.json().catch(() => ({}))) as {
    username?: string;
  };
  const name = (username ?? "").trim().toLowerCase();
  if (!name) {
    return NextResponse.json(
      { error: "Informe um nome de usuário." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { username: name } });
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado. Peça ao admin para te cadastrar." },
      { status: 404 },
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.isAdmin = user.isAdmin;
  await session.save();

  return NextResponse.json({ ok: true, isAdmin: user.isAdmin });
}
