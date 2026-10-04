import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { matchStats } from "@/lib/game";
import { prisma } from "@/lib/prisma";

export default async function RecordsPage() {
  const user = await requireUser();
  const matches = await prisma.match.findMany({
    where: { playerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <div className="container">
    <SiteHeader userName={user.displayName} darkMode={user.darkMode} />
    <main className="records-container">
      <section className="profile-spotlight">
        <span className="panel-kicker">Player records</span>
        <h2>{user.displayName}'s Records</h2>
        <div className="record-grid">
          <div className="record-item"><span className="record-label">Wins</span><span className="record-value">{user.wins}</span></div>
          <div className="record-item"><span className="record-label">Losses</span><span className="record-value">{user.losses}</span></div>
          <div className="record-item"><span className="record-label">Draws</span><span className="record-value">{user.draws}</span></div>
          <div className="record-item"><span className="record-label">Points</span><span className="record-value">{user.points}</span></div>
        </div>
      </section>
      <section className="rank-section">
        <h3>Current rank</h3>
        <div className="rank-badge">{matchStats(user)}</div>
      </section>
      <section className="match-history">
        <h3>Recent matches</h3>
        <div className="matches-table">
          <div className="table-header"><div className="table-col">Opponent</div><div className="table-col">Result</div><div className="table-col">Date</div></div>
          {matches.length === 0 ? <div className="table-row"><div className="table-col">No matches yet</div><div /><div /></div> : matches.map((match) => <div className="table-row" key={match.id}>
            <div className="table-col">{match.opponent}</div>
            <div className={`table-col match-result-${match.result}`}>{match.result[0].toUpperCase() + match.result.slice(1)}</div>
            <div className="table-col">{match.createdAt.toLocaleDateString()}</div>
          </div>)}
        </div>
      </section>
    </main>
  </div>;
}