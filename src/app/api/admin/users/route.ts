import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}

// POST /api/admin/users  body: { username, isAdmin? } — cadastra um amigo.
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { username, isAdmin } = (await req.json().catch(() => ({}))) as {
    username?: string;
    isAdmin?: boolean;
  };
  const name = (username ?? "").trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { username: name } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com esse nome." },
      { status: 409 },
    );
  }
  const user = await prisma.user.create({
    data: { username: name, isAdmin: Boolean(isAdmin) },
  });
  return NextResponse.json({ ok: true, user });
}

// DELETE /api/admin/users  body: { id } — remove um usuário (e seus palpites).
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  if (!id) {
    return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  }
  if (id === admin.id) {
    return NextResponse.json(
      { error: "Você não pode remover a si mesmo." },
      { status: 400 },
    );
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
