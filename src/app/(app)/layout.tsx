import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-900/80">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <Link href="/" className="font-bold">
            ⚽ Bolão 2026
          </Link>
          <Link href="/" className="hover:text-green-600">
            Jogos
          </Link>
          <Link href="/palpites" className="hover:text-green-600">
            Meus palpites
          </Link>
          <Link href="/torneio" className="hover:text-green-600">
            Copa
          </Link>
          <Link href="/ranking" className="hover:text-green-600">
            Ranking
          </Link>
          {user.isAdmin && (
            <Link href="/admin" className="hover:text-green-600">
              Admin
            </Link>
          )}
          <span className="ml-auto text-neutral-500">{user.username}</span>
          <LogoutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
