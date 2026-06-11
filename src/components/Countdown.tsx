"use client";

// Relógio regressivo que tica de 1 em 1 segundo até um instante alvo (kickoff do jogo).
// Mostra HH:MM:SS quando falta 1h+ e MM:SS abaixo disso. Renderiza só o texto do tempo
// para que o chamador controle o entorno ("Fecha em …", "⏱ …" etc.).

import { useEffect, useState } from "react";

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function Countdown({
  target,
  className,
}: {
  target: string | number; // ISO ou epoch ms
  className?: string;
}) {
  const targetMs =
    typeof target === "number" ? target : new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // suppressHydrationWarning: o valor difere ~1s entre servidor e cliente.
  return (
    <span className={className} suppressHydrationWarning>
      {formatDuration(targetMs - now)}
    </span>
  );
}

export default Countdown;
