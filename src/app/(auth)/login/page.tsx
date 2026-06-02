import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-2xl font-bold">⚽ Bolão da Copa 2026</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Entre com seu nome de usuário para palpitar.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
