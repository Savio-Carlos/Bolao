// Gráfico de linhas multi-série em SVG puro (renderizado no servidor, sem libs).

export interface Series {
  name: string;
  color: string;
  values: number[]; // alinhado com `labels`
}

export function LineChart({
  labels,
  series,
  invert = false,
  unit = "",
}: {
  labels: string[];
  series: Series[];
  invert?: boolean; // true: valor 0 no topo (usado em "diferença para o líder")
  unit?: string;
}) {
  const W = 640;
  const H = 260;
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = labels.length;
  const maxY = Math.max(1, ...series.flatMap((s) => s.values));

  const x = (i: number) => (n <= 1 ? padL : padL + (i * plotW) / (n - 1));
  const y = (v: number) =>
    invert
      ? padT + (v / maxY) * plotH
      : padT + (1 - v / maxY) * plotH;

  // Linhas de grade horizontais (5 níveis).
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  // Mostra no máximo ~8 rótulos no eixo X para não poluir.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* grade + rótulos do eixo Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              className="stroke-black/10 dark:stroke-white/10"
              strokeWidth={1}
            />
            <text
              x={padL - 4}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-neutral-400 text-[9px]"
            >
              {t}
            </text>
          </g>
        ))}

        {/* rótulos do eixo X */}
        {labels.map((lab, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-neutral-400 text-[9px]"
            >
              {lab}
            </text>
          ) : null,
        )}

        {/* séries */}
        {series.map((s) => (
          <g key={s.name}>
            {n > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
            )}
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={n > 30 ? 1.5 : 2.5} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>

      {/* legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>
      {unit && <span className="text-xs text-neutral-400">{unit}</span>}
    </div>
  );
}

// Paleta para diferenciar os jogadores.
export const PALETTE = [
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
  "#9333ea",
  "#475569",
];
