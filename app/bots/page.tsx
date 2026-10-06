import { SiteHeader } from "@/components/site-header";
import { BotPicker } from "@/components/bot-picker";
import { requireUser } from "@/lib/auth";

type BotsPageProps = {
  searchParams: Promise<{ difficulty?: string; mode?: string }>;
};

const difficulties = ["easy", "medium", "hard"] as const;

export default async function BotsPage({ searchParams }: BotsPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const difficulty = difficulties.find((value) => value === params.difficulty)
    ?? user.selectedDifficulty;
  const modeLabel = params.mode?.slice(0, 30) || "AI match";

  return (
    <div className="container">
      <SiteHeader userName={user.displayName} darkMode={user.darkMode} />
      <main className="records-container">
        <section className="profile-spotlight">
          <span className="panel-kicker">{modeLabel}</span>
          <h2>Choose your bot</h2>
          <p>Pick a rival to start your {difficulty} match.</p>
        </section>
        <section className="opponent-roster">
          <BotPicker selectedOpponent={user.selectedOpponent} difficulty={difficulty} />
        </section>
      </main>
    </div>
  );
}
