import { prisma } from "@/lib/db";
import { fetchMatches } from "./client";
import { computePoints } from "./types";

export interface SyncResult {
  fetched: number;
  upserted: number;
  finished: number;
  pointsUpdated: number;
}

// Busca os jogos na fonte externa, atualiza o banco e recalcula a pontuação
// dos palpites de todos os jogos já encerrados. É idempotente: pode rodar
// quantas vezes quiser que o resultado é o mesmo.
export async function syncMatches(): Promise<SyncResult> {
  const matches = await fetchMatches();

  // Estado atual no banco para NÃO regredir dados já conhecidos: a football-data
  // grátis às vezes devolve o chaveamento com os times zerados (cache instável),
  // e um sync que pegasse essa resposta apagaria times/placar já confirmados.
  const existing = await prisma.match.findMany({
    select: {
      externalId: true,
      homeTeam: true,
      awayTeam: true,
      homeCrest: true,
      awayCrest: true,
      homeScore: true,
      awayScore: true,
      winner: true,
    },
  });
  const prev = new Map(existing.map((e) => [e.externalId, e]));

  for (const m of matches) {
    const ex = prev.get(m.externalId);
    // Valor novo vence quando existe; se vier nulo, mantém o já conhecido.
    const data = {
      stage: m.stage,
      group: m.group,
      homeTeam: m.homeTeam ?? ex?.homeTeam ?? null,
      awayTeam: m.awayTeam ?? ex?.awayTeam ?? null,
      homeCrest: m.homeCrest ?? ex?.homeCrest ?? null,
      awayCrest: m.awayCrest ?? ex?.awayCrest ?? null,
      kickoff: m.kickoff,
      status: m.status,
      homeScore: m.homeScore ?? ex?.homeScore ?? null,
      awayScore: m.awayScore ?? ex?.awayScore ?? null,
      winner: m.winner ?? ex?.winner ?? null,
    };
    await prisma.match.upsert({
      where: { externalId: m.externalId },
      create: { externalId: m.externalId, ...data },
      update: data,
    });
  }

  const pointsUpdated = await recalculatePoints();

  const finished = await prisma.match.count({ where: { status: "FINISHED" } });
  return {
    fetched: matches.length,
    upserted: matches.length,
    finished,
    pointsUpdated,
  };
}

// Recalcula points de todos os palpites de jogos encerrados com placar válido.
// Retorna quantos palpites tiveram a pontuação alterada.
export async function recalculatePoints(): Promise<number> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } },
    select: { id: true, homeScore: true, awayScore: true },
  });

  let updated = 0;
  for (const match of finishedMatches) {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      select: { id: true, homeScore: true, awayScore: true, points: true },
    });
    for (const p of predictions) {
      const points = computePoints(
        p.homeScore,
        p.awayScore,
        match.homeScore!,
        match.awayScore!,
      );
      if (p.points !== points) {
        await prisma.prediction.update({
          where: { id: p.id },
          data: { points },
        });
        updated++;
      }
    }
  }
  return updated;
}
