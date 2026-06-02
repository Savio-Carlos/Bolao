import { NextResponse } from "next/server";
import { syncMatches } from "@/lib/football/sync";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/sync
// Autoriza por: header "Authorization: Bearer <SYNC_SECRET>" (cron) OU sessão de admin (botão).
async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.SYNC_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;

  const user = await getCurrentUser();
  return Boolean(user?.isAdmin);
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Permite acionar pelo navegador/cron via GET também (mesma autorização).
export async function GET(req: Request) {
  return POST(req);
}
