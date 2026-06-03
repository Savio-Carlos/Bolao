"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <input
        type="text"
        autoFocus
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="seu nome de usuário"
        className="field"
      />
      {error && (
        <p style={{ color: "var(--red)", fontFamily: "var(--ff-mono)", fontSize: 12 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !username.trim()}
        className="btn"
        style={{ width: "100%" }}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
