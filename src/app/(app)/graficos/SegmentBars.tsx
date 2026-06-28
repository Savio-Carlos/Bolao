// Barras horizontais com vários segmentos por jogador (pontos por fase, acertos
// vs erros, etc.). Genérica: cada linha traz seus próprios segmentos. Reaproveita
// o visual das barras empilhadas (classes .sbar-*).

export interface Seg {
  value: number;
  color: string;
  title?: string;
}

export interface SegRow {
  name: string;
  me?: boolean;
  segments: Seg[];
  display: string; // texto à direita (ex.: total de pontos ou "3/5")
}

export function SegmentBars({
  rows,
  legend,
  max,
}: {
  rows: SegRow[];
  legend: { label: string; color: string }[];
  max?: number; // escala compartilhada; default = maior soma de segmentos
}) {
  const m =
    max ??
    Math.max(
      1,
      ...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)),
    );
  return (
    <div className="sbars">
      {legend.length > 0 && (
        <div className="legend-line">
          {legend.map((l) => (
            <span className="li" key={l.label}>
              <span className="sw" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {rows.map((r) => (
        <div className={`sbar-row${r.me ? " me" : ""}`} key={r.name}>
          <span className="sbar-name">
            {r.name}
            {r.me ? " (você)" : ""}
          </span>
          <div className="sbar-track">
            {r.segments.map((s, i) =>
              s.value > 0 ? (
                <div
                  key={i}
                  className="sbar-seg"
                  style={{ width: `${(s.value / m) * 100}%`, background: s.color }}
                  title={s.title}
                />
              ) : null,
            )}
          </div>
          <span className="sbar-total">{r.display}</span>
        </div>
      ))}
    </div>
  );
}
