import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/format";
import { LineChart, PALETTE, type Series } from "./LineChart";

export const dynamic = "force-dynamic";

function dayShort(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export default async function GraficosPage() {
  const preds = await prisma.prediction.findMany({
    where: { points: { not: null } },
    include: {
      match: { select: { kickoff: true } },
      user: { select: { id: true, username: true } },
    },
    orderBy: { match: { kickoff: "asc" } },
  });

  if (preds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Gráficos</h1>
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-neutral-500 dark:border-white/15">
          Os gráficos aparecem aqui assim que os primeiros jogos forem
          encerrados. 📈
        </div>
      </div>
    );
  }

  const nameById = new Map<number, string>();
  for (const p of preds) nameById.set(p.user.id, p.user.username);
  const userIds = [...nameById.keys()];

  // Pontos ganhos por dia (na ordem cronológica).
  const days: string[] = [];
  const perDay = new Map<string, Map<number, number>>();
  for (const p of preds) {
    const day = dayKey(p.match.kickoff);
    if (!perDay.has(day)) {
      perDay.set(day, new Map());
      days.push(day);
    }
    const m = perDay.get(day)!;
    m.set(p.user.id, (m.get(p.user.id) ?? 0) + (p.points ?? 0));
  }

  // Cumulativo por dia (carrega o total anterior mesmo sem pontuar no dia).
  const cum = new Map<number, number>(userIds.map((id) => [id, 0]));
  const cumByUser = new Map<number, number[]>(userIds.map((id) => [id, []]));
  for (const day of days) {
    const m = perDay.get(day)!;
    for (const id of userIds) {
      cum.set(id, cum.get(id)! + (m.get(id) ?? 0));
      cumByUser.get(id)!.push(cum.get(id)!);
    }
  }

  // Diferença para o líder em cada dia (líder = 0).
  const leaderByDay = days.map((_, i) =>
    Math.max(...userIds.map((id) => cumByUser.get(id)![i])),
  );
  const gapByUser = new Map<number, number[]>(
    userIds.map((id) => [
      id,
      cumByUser.get(id)!.map((v, i) => leaderByDay[i] - v),
    ]),
  );

  // Ordena os jogadores pelo total final (para cores e legenda estáveis).
  const ordered = [...userIds].sort(
    (a, b) =>
      cumByUser.get(b)!.at(-1)! - cumByUser.get(a)!.at(-1)! ||
      nameById.get(a)!.localeCompare(nameById.get(b)!, "pt-BR"),
  );

  const labels = days.map(dayShort);
  const evolution: Series[] = ordered.map((id, i) => ({
    name: nameById.get(id)!,
    color: PALETTE[i % PALETTE.length],
    values: cumByUser.get(id)!,
  }));
  const gap: Series[] = ordered.map((id, i) => ({
    name: nameById.get(id)!,
    color: PALETTE[i % PALETTE.length],
    values: gapByUser.get(id)!,
  }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Gráficos</h1>

      <section className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Evolução do ranking</h2>
        <p className="text-sm text-neutral-500">
          Total de pontos acumulado por jogador ao longo dos dias.
        </p>
        <LineChart labels={labels} series={evolution} />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Diferença para o líder</h2>
        <p className="text-sm text-neutral-500">
          Quantos pontos cada um está atrás do líder (no topo = liderança).
        </p>
        <LineChart labels={labels} series={gap} invert unit="Menor = mais perto do topo." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pontos por rodada (dia)</h2>
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">Jogador</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-2 text-center whitespace-nowrap">
                    {dayShort(d)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((id) => (
                <tr
                  key={id}
                  className="border-t border-black/5 dark:border-white/5"
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {nameById.get(id)}
                  </td>
                  {days.map((d) => {
                    const pts = perDay.get(d)!.get(id) ?? 0;
                    return (
                      <td
                        key={d}
                        className={`px-2 py-2 text-center tabular-nums ${
                          pts === 0 ? "text-neutral-300 dark:text-neutral-600" : ""
                        }`}
                      >
                        {pts}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {cumByUser.get(id)!.at(-1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
