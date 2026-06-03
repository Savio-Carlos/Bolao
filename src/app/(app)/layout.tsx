import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-col">
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="ball" />
            <span className="brand-name">
              Bolão <b>2026</b>
            </span>
          </Link>
          <NavLinks isAdmin={user.isAdmin} />
          <div className="nav-right">
            <span className="user-chip">
              <span className="user-num">{initials}</span>
              {user.username}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>

      <main className="wrap flex-1 pb-10">{children}</main>

      <footer className="wrap">
        <div className="almanac-foot">
          <div className="legend">
            <span>
              <b>10 pts</b> placar exato
            </span>
            <span>
              <b>5 pts</b> vencedor / empate
            </span>
            <span className="g">★ Bônus</span> <span>palpites da Copa</span>
          </div>
          <div className="mark">Bolão da Copa · MMXXVI</div>
        </div>
      </footer>
    </div>
  );
}
