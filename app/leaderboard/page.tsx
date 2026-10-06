import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  const [user, players] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      select: {
        displayName: true,
        points: true,
        wins: true,
        losses: true,
        draws: true,
      },
      orderBy: [
        { points: "desc" },
        { wins: "desc" },
        { losses: "asc" },
        { displayNameKey: "asc" },
      ],
      take: 100,
    }),
  ]);

  return (
    <div className="container">
      {user ? (
        <SiteHeader userName={user.displayName} darkMode={user.darkMode} />
      ) : (
        <nav className="nav-bar" aria-label="Main navigation">
          <Link className="nav-logo" href="/leaderboard" aria-label="XO.am leaderboard">
            <Image
              src="/xo-am-logo.svg"
              alt="XO.am tic-tac-toe arena"
              width={190}
              height={68}
              priority
            />
          </Link>
          <div className="nav-links">
            <Link className="nav-link active" href="/leaderboard">Leaderboard</Link>
            <Link className="nav-link" href="/login">Log in</Link>
            <Link className="nav-link" href="/signup">Sign up</Link>
          </div>
        </nav>
      )}
      <main className="records-container">
        <section className="profile-spotlight">
          <span className="panel-kicker">XO.am Arena</span>
          <h2>Leaderboard</h2>
          <p>Top players ranked by points. Keep playing to climb the ranks.</p>
        </section>
        <section className="match-history">
          <div className="matches-table leaderboard-table" role="table" aria-label="Player leaderboard">
            <div className="table-header" role="row">
              <div className="table-col" role="columnheader">Rank</div>
              <div className="table-col" role="columnheader">Player</div>
              <div className="table-col" role="columnheader">Points</div>
              <div className="table-col" role="columnheader">Wins</div>
              <div className="table-col" role="columnheader">Losses</div>
              <div className="table-col" role="columnheader">Draws</div>
            </div>
            {players.length === 0 ? (
              <div className="table-row" role="row">
                <div className="table-col" role="cell" aria-colspan={6}>No players yet</div>
              </div>
            ) : players.map((player, index) => (
              <div className="table-row" role="row" key={player.displayName}>
                <div className="table-col" role="cell">#{index + 1}</div>
                <div className="table-col" role="cell">{player.displayName}</div>
                <div className="table-col" role="cell">{player.points}</div>
                <div className="table-col" role="cell">{player.wins}</div>
                <div className="table-col" role="cell">{player.losses}</div>
                <div className="table-col" role="cell">{player.draws}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
