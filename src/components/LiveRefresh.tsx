"use client";

// Quando há jogo ao vivo, revalida a página em intervalos para puxar o placar mais novo
// do banco (alimentado pelo sync). A home é force-dynamic, então router.refresh() basta.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

export default LiveRefresh;
