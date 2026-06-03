"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Jogos" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/palpites", label: "Meus palpites" },
  { href: "/torneio", label: "Copa" },
  { href: "/ranking", label: "Ranking" },
  { href: "/estatisticas", label: "Stats" },
  { href: "/graficos", label: "Gráficos" },
];

export default function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin" }]
    : LINKS;

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/jogos");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="nav">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`navlink${isActive(l.href) ? " active" : ""}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
