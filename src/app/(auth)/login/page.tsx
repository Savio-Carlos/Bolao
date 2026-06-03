import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div
        className="pcard"
        style={{ width: "100%", maxWidth: 380, padding: "26px 26px 28px" }}
      >
        <Link
          className="brand"
          href="/"
          style={{ justifyContent: "center", marginBottom: 14 }}
        >
          <span className="ball" />
          <span className="brand-name">
            Bolão <b>2026</b>
          </span>
        </Link>
        <p className="kicker" style={{ color: "var(--green)", fontSize: 11, fontWeight: 700 }}>
          ★ Almanaque do Mundial
        </p>
        <h1
          className="serif"
          style={{ fontSize: 32, lineHeight: 1, margin: "4px 0 6px" }}
        >
          Bolão da <em style={{ color: "var(--green)" }}>Copa</em>
        </h1>
        <p
          className="mono"
          style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}
        >
          Entre com seu nome de usuário para palpitar.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
