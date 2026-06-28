// Barras horizontais de uma métrica única por jogador (aproveitamento, média de
// gols, etc.). Reaproveita o visual das barras empilhadas (classes .sbar-*).

export interface MetricRow {
  name: string;
  me?: boolean;
  value: number; // controla o tamanho da barra
  display: string; // texto mostrado à direita
}

export function MetricBars({
  rows,
  color = "var(--green)",
  max,
}: {
  rows: MetricRow[];
  color?: string;
  max?: number; // escala fixa opcional (ex.: 100 p/ porcentagem)
}) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="sbars">
      {rows.map((r) => (
        <div className={`sbar-row${r.me ? " me" : ""}`} key={r.name}>
          <span className="sbar-name">
            {r.name}
            {r.me ? " (você)" : ""}
          </span>
          <div className="sbar-track">
            <div
              className="sbar-seg"
              style={{ width: `${(r.value / m) * 100}%`, background: color }}
            />
          </div>
          <span className="sbar-total" style={{ color }}>
            {r.display}
          </span>
        </div>
      ))}
    </div>
  );
}
