import { SiteHeader } from "@/components/site-header";
import { MatchClient } from "@/components/match-client";
import { requireUser } from "@/lib/auth";

type MatchPageProps = {
  searchParams: Promise<{ mode?: string; difficulty?: string; opponent?: string; room?: string }>;
};

export default async function MatchPage({ searchParams }: MatchPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const mode = params.mode === "offline" || params.mode === "online" ? params.mode : "ai";
  const difficulty = ["easy", "medium", "hard"].includes(params.difficulty ?? "") ? params.difficulty! : user.selectedDifficulty;
  const opponent = params.opponent?.slice(0, 24) || user.selectedOpponent;
  const roomCode = params.room?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) ?? "";

  return <><div className="container"><SiteHeader userName={user.displayName} darkMode={user.darkMode} /></div><MatchClient
    user={{ displayName: user.displayName, wins: user.wins, losses: user.losses }}
    mode={mode}
    difficulty={difficulty}
    opponent={opponent}
    roomCode={roomCode}
  /></>;
}