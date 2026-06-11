import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { computeRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const me = await getCurrentUser();

  const [users, predictions, tournamentBets] = await Promise.all([
    prisma.user.findMany({ orderBy: { username: "asc" } }),
    prisma.prediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
    prisma.tournamentBet.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
  ]);

  const rows = computeRanking(users, predictions, tournamentBets);

  const [first, second, third] = rows;
  const podium: { row: (typeof rows)[number]; place: 1 | 2 | 3 }[] = [];
  if (second) podium.push({ row: second, place: 2 });
  if (first) podium.push({ row: first, place: 1 });
  if (third) podium.push({ row: third, place: 3 });
  const placeClass = { 1: "first", 2: "second", 3: "third" } as const;
  const ribLabel = { 1: "★ Líder ★", 2: "Vice-líder", 3: "3º lugar" } as const;

  return (
    <>
      <header className="page-head">
        <p className="kicker">★ Classificação geral do bolão</p>
        <h1>
          O <em>Ranking</em>
        </h1>
        <p className="sub">
          Os melhores palpiteiros do mundial. Placar exato vale <b>10</b>,
          acertar o vencedor vale <b>5</b>, e os palpites da Copa pagam{" "}
          <b>bônus</b>.
        </p>
        <div className="page-rule" />
      </header>

      {podium.length > 0 && (
        <section className="podium">
          {podium.map(({ row, place }) => (
            <div className={`pod ${placeClass[place]}`} key={row.user.id}>
              <span className="rib">{ribLabel[place]}</span>
              <div className="pmedal">{place}</div>
              <div className="pname">{row.user.username}</div>
              <div className="ppts">{row.total} PTS</div>
              <div className="pmeta">
                <b>{row.exact}</b> exatos · <b>{row.partial}</b> parciais
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="section-head">
        <h2>
          <span className="star">★</span> Tabela completa
        </h2>
        <span className="bar" />
        <span className="daytag">{rows.length} jogadores</span>
      </div>

      <div className="alm-table-wrap">
        <table className="alm-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="l">Jogador</th>
              <th>Exatos</th>
              <th>Parciais</th>
              <th>Bônus</th>
              <th className="r">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user.id} className={me?.id === r.user.id ? "me" : ""}>
                <td>
                  <span className={`rank-pos${i < 3 ? " top" : ""}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="l">
                  <span className="name">{r.user.username}</span>
                  {me?.id === r.user.id && (
                    <span
                      className="num"
                      style={{ color: "var(--ink-faint)", fontSize: 10 }}
                    >
                      {" "}
                      você
                    </span>
                  )}
                </td>
                <td className="num">{r.exact}</td>
                <td className="num">{r.partial}</td>
                <td className="num" style={{ color: "var(--gold)" }}>
                  {r.bonus || "—"}
                </td>
                <td className="r">
                  <span className="pts">{r.total}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
