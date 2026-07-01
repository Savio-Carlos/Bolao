// Barras horizontais empilhadas: de onde vêm os pontos de cada jogador
// (cravadas +10 vs parciais +5). SVG-free, renderizado no servidor.

export interface BarRow {
  name: string;
  me?: boolean;
  exact: number; // nº de placares cravados (+10)
  partial: number; // nº de parciais (+5)
  zero: number; // nº de palpites zerados
  exactPts: number; // exact * 10
  partialPts: number; // partial * 5
  advancePts: number; // bônus de "quem avança" no mata-mata
  total: number; // exactPts + partialPts + advancePts
}

export function StackedBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  // Só mostra a legenda/segmento de avanço quando já houver pontos de mata-mata.
  const anyAdvance = rows.some((r) => r.advancePts > 0);
  return (
    <div className="sbars">
      <div className="legend-line">
        <span className="li">
          <span className="sw" style={{ background: "var(--gold)" }} /> Cravadas
          (+10)
        </span>
        <span className="li">
          <span className="sw" style={{ background: "var(--green)" }} /> Parciais
          (+5)
        </span>
        {anyAdvance && (
          <span className="li">
            <span className="sw" style={{ background: "var(--chart-4)" }} /> Avanço
            (+5)
          </span>
        )}
      </div>
      {rows.map((r) => (
        <div className={`sbar-row${r.me ? " me" : ""}`} key={r.name}>
          <span className="sbar-name">
            {r.name}
            {r.me ? " (você)" : ""}
          </span>
          <div className="sbar-track">
            <div
              className="sbar-seg exact"
              style={{ width: `${(r.exactPts / max) * 100}%` }}
              title={`${r.exact} cravada(s) · ${r.exactPts} pts`}
            />
            <div
              className="sbar-seg partial"
              style={{ width: `${(r.partialPts / max) * 100}%` }}
              title={`${r.partial} parcial(is) · ${r.partialPts} pts`}
            />
            <div
              className="sbar-seg"
              style={{
                width: `${(r.advancePts / max) * 100}%`,
                background: "var(--chart-4)",
              }}
              title={`avanço · ${r.advancePts} pts`}
            />
          </div>
          <span className="sbar-total">{r.total}</span>
        </div>
      ))}
    </div>
  );
}
