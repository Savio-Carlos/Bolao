// Mapa de calor dos placares palpitados: linhas = gols do mandante, colunas =
// gols do visitante. Quanto mais palpitado o placar, mais escura a célula.

import { Fragment } from "react";

export function ScoreHeatmap({
  counts,
  dim,
  topKey,
}: {
  counts: Map<string, number>; // "h-a" -> quantidade
  dim: number; // mostra placares de 0..dim em cada eixo
  topKey: string | null; // placar mais palpitado, destacado
}) {
  const max = Math.max(1, ...counts.values());
  const axis = Array.from({ length: dim + 1 }, (_, i) => i);

  return (
    <div className="heat">
      <div
        className="heat-grid"
        style={{ gridTemplateColumns: `auto repeat(${dim + 1}, 1fr)` }}
      >
        <span className="heat-corner">M\V</span>
        {axis.map((a) => (
          <span key={`c${a}`} className="heat-head">
            {a}
          </span>
        ))}
        {axis.map((h) => (
          <Fragment key={`r${h}`}>
            <span className="heat-head">{h}</span>
            {axis.map((a) => {
              const key = `${h}-${a}`;
              const c = counts.get(key) ?? 0;
              const pct = Math.round((c / max) * 100);
              return (
                <span
                  key={key}
                  className={`heat-cell${key === topKey ? " top" : ""}`}
                  style={{
                    background: `color-mix(in srgb, var(--green) ${pct}%, transparent)`,
                  }}
                  title={`${h} × ${a}: ${c} palpite(s)`}
                >
                  {c || ""}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="heat-legend">
        Linha = gols do mandante · Coluna = gols do visitante. Mais escuro = mais
        palpitado.
      </p>
    </div>
  );
}
