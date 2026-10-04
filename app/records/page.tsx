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

  return (
    <div className="container">
      <SiteHeader userName={user.displayName} darkMode={user.darkMode} />
      <main className="records-container">
        <section className="profile-spotlight">
          <span className="panel-kicker">Player records</span>
          <h2>{user.displayName}&apos;s Records</h2>
          <div className="record-grid">
            <Record label="Wins" value={user.wins} />
            <Record label="Losses" value={user.losses} />
            <Record label="Draws" value={user.draws} />
            <Record label="Points" value={user.points} />
          </div>
        </section>
        <section className="rank-section">
          <h3>Current rank</h3>
          <div className="rank-badge">{matchStats(user)}</div>
        </section>
        <section className="match-history">
          <h3>Recent matches</h3>
          <div className="matches-table">
            <div className="table-header">
              <div className="table-col">Opponent</div>
              <div className="table-col">Result</div>
              <div className="table-col">Date</div>
            </div>
            {matches.length === 0 ? (
              <div className="table-row">
                <div className="table-col">No matches yet</div>
                <div />
                <div />
              </div>
            ) : matches.map((match) => (
              <div className="table-row" key={match.id}>
                <div className="table-col">{match.opponent}</div>
                <div className={`table-col match-result-${match.result}`}>
                  {match.result[0].toUpperCase() + match.result.slice(1)}
                </div>
                <div className="table-col">{match.createdAt.toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Record({ label, value }: { label: string; value: number }) {
  return (
    <div className="record-item">
      <span className="record-label">{label}</span>
      <span className="record-value">{value}</span>
    </div>
  );
}