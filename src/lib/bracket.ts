// Chaveamento oficial do mata-mata da Copa 2026 (estilo FIFA).
//
// PROBLEMA: a numeração oficial dos jogos (J73..J104) NÃO segue a ordem do
// relógio — por exemplo, Brasil×Japão é o J76 mas começa antes do J74. Logo,
// ordenar as colunas do chaveamento por horário (como era feito antes) cola
// lado a lado jogos que não se enfrentam. A estrutura da chave é fixa e
// pública, então a codificamos aqui.
//
// COMO MAPEAMOS sem depender do número do jogo (a fonte football-data usa ids
// internos, não 1..104): a ORDEM RELATIVA dos horários de cada fase é estável e
// igual à da FIFA. Então, para cada fase, ordenamos os jogos por horário e
// traduzimos "posição no horário" -> "posição na chave" pelas tabelas abaixo.
//
// Cada lista vai de CIMA para BAIXO do chaveamento. A metade da esquerda leva à
// semifinal 1 (J101); a da direita, à semifinal 2 (J102). Os índices apontam
// para a lista da fase já ordenada por horário (kickoff asc).
//
// Derivação (conferida com a tabela oficial — ver feed J89=V74×V77, J91=V76×V78):
//   R32 por horário -> nº:  [73,76,74,75,78,77,79,80,82,81,84,83,85,88,86,87]
//   R32 ordem da chave (nº): esq [74,77,73,75,83,84,81,82] dir [76,78,79,80,86,88,85,87]
const BRACKET_TREE_INDICES: Record<string, number[]> = {
  // 16 jogos: esquerda (8) + direita (8).
  LAST_32: [2, 5, 0, 3, 11, 10, 9, 8, 1, 4, 6, 7, 14, 13, 12, 15],
  // 8 jogos: esquerda (4) + direita (4).
  LAST_16: [1, 0, 4, 5, 2, 3, 6, 7],
  // 4 jogos: esquerda (2) + direita (2).
  QUARTER_FINALS: [0, 1, 2, 3],
  // 2 jogos: esquerda (1) + direita (1).
  SEMI_FINALS: [0, 1],
};

// Divide os jogos de uma fase (já ordenados por horário) nas duas metades do
// chaveamento, cada uma em ordem de cima para baixo. Quando a fase tem uma
// contagem inesperada (dados parciais), cai no fatiamento simples por horário
// para nunca quebrar a renderização.
export function bracketHalves<T>(stage: string, kickoffSorted: T[]): [T[], T[]] {
  const order = BRACKET_TREE_INDICES[stage];
  if (!order || kickoffSorted.length !== order.length) {
    const h = Math.ceil(kickoffSorted.length / 2);
    return [kickoffSorted.slice(0, h), kickoffSorted.slice(h)];
  }
  const treeOrdered = order.map((i) => kickoffSorted[i]);
  const h = treeOrdered.length / 2;
  return [treeOrdered.slice(0, h), treeOrdered.slice(h)];
}
