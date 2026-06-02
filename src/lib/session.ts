import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
  username?: string;
  isAdmin?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "bolao_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 dias
  },
};

// Lê (ou cria) a sessão a partir dos cookies da requisição atual.
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Atalho para páginas/handlers que exigem usuário logado.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    id: session.userId,
    username: session.username as string,
    isAdmin: Boolean(session.isAdmin),
  };
}
