// Gráfico de linhas multi-série em SVG puro (renderizado no servidor, sem libs).
// As cores das séries usam variáveis CSS (--chart-*), então se adaptam ao tema.

export interface Series {
  name: string;
  color: string;
  values: number[]; // alinhado com `labels`
  me?: boolean; // linha do usuário ("você"): mais grossa
}

// Valores das linhas de grade do eixo Y, sempre múltiplos de 5. Escolhe um passo
// redondo (múltiplo de 5) mirando ~4 intervalos e vai de 0 até o múltiplo de
// `passo` imediatamente acima do maior valor.
function niceTicksMultipleOf5(maxValue: number): number[] {
  const targetIntervals = 4;
  const step = Math.max(5, Math.ceil(maxValue / targetIntervals / 5) * 5);
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

export function LineChart({
  labels,
  series,
  invert = false,
  unit = "",
  rank = false,
}: {
  labels: string[];
  series: Series[];
  invert?: boolean; // true: valor 0 no topo (usado em "diferença para o líder")
  unit?: string;
  rank?: boolean; // true: eixo de posições inteiras (1,2,3…N), sem o zero
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
  const allValues = series.flatMap((s) => s.values);

  // Linhas de grade do eixo Y. No modo "rank" são as posições inteiras (1,2,3…N)
  // sem o zero — com poucos jogadores a escala de 5 em 5 não fazia sentido.
  // Caso contrário, múltiplos de 5 redondos, com o topo na última linha (assim o
  // eixo nunca mostra número quebrado tipo 17, 33, 66…).
  let ticks: number[];
  let yMin: number;
  let yMax: number;
  if (rank) {
    yMin = Math.max(1, Math.floor(Math.min(...allValues)));
    yMax = Math.max(yMin, Math.ceil(Math.max(...allValues)));
    ticks = [];
    for (let v = yMin; v <= yMax; v++) ticks.push(v);
  } else {
    ticks = niceTicksMultipleOf5(Math.max(1, ...allValues));
    yMin = 0;
    yMax = ticks[ticks.length - 1];
  }
  const span = yMax - yMin || 1;

  const x = (i: number) => (n <= 1 ? padL : padL + (i * plotW) / (n - 1));
  const y = (v: number) =>
    invert
      ? padT + ((v - yMin) / span) * plotH
      : padT + (1 - (v - yMin) / span) * plotH;

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
