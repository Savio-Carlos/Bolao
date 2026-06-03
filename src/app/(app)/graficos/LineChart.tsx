// Gráfico de linhas multi-série em SVG puro (renderizado no servidor, sem libs).
// As cores das séries usam variáveis CSS (--chart-*), então se adaptam ao tema.

export interface Series {
  name: string;
  color: string;
  values: number[]; // alinhado com `labels`
  me?: boolean; // linha do usuário ("você"): mais grossa
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
    invert ? padT + (v / maxY) * plotH : padT + (1 - v / maxY) * plotH;

  // Linhas de grade horizontais (5 níveis).
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  // Mostra no máximo ~8 rótulos no eixo X para não poluir.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="flex flex-col gap-2">
      <div className="legend-line">
        {series.map((s) => (
          <span key={s.name} className="li">
            <span
              className={`sw${s.me ? " me-sw" : ""}`}
              style={{ background: s.color }}
            />
            {s.name}
            {s.me ? " (você)" : ""}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
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
              className="fill-ink-faint text-[9px]"
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
              className="fill-ink-faint text-[9px]"
            >
              {lab}
            </text>
          ) : null,
        )}

        {/* séries (a do usuário por último, para ficar por cima) */}
        {[...series]
          .sort((a, b) => Number(a.me) - Number(b.me))
          .map((s) => (
            <g key={s.name}>
              {n > 1 && (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.me ? 3.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={s.me ? 1 : 0.92}
                  points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                />
              )}
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={s.me ? 4 : n > 30 ? 1.5 : 2.5}
                  fill={s.color}
                />
              ))}
            </g>
          ))}
      </svg>

      {unit && (
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {unit}
        </span>
      )}
    </div>
  );
}

// Paleta para diferenciar os jogadores (variáveis CSS, adaptáveis ao tema).
export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--chart-11)",
  "var(--chart-12)",
];

// Cor dedicada à linha do usuário ("você").
export const ME_COLOR = "var(--chart-me)";
