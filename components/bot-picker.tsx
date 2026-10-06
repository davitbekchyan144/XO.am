"use client";

import { useState } from "react";
import { opponents, rankNames } from "@/lib/opponents";

export function BotPicker({
  selectedOpponent,
  difficulty,
}: {
  selectedOpponent: string;
  difficulty: string;
}) {
  const [busyBot, setBusyBot] = useState("");
  const [error, setError] = useState("");

  async function playAgainst(name: string) {
    setBusyBot(name);
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOpponent: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your selected bot.");

      const search = new URLSearchParams({
        mode: "ai",
        difficulty,
        opponent: name,
      });
      window.location.assign(`/match?${search.toString()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the match.");
      setBusyBot("");
    }
  }

  return (
    <>
      <div className="roster-grid">
        {opponents.map((bot) => (
          <button
            className={`roster-card${selectedOpponent === bot.name ? " active" : ""}`}
            key={bot.name}
            type="button"
            disabled={busyBot !== ""}
            onClick={() => void playAgainst(bot.name)}
          >
            <span className="roster-avatar" aria-hidden="true">{bot.name[0]}</span>
            <span className="roster-name">{bot.name}</span>
            <span className="roster-tier">{rankNames[bot.difficulty]}</span>
            <span className="bot-play-label">
              {busyBot === bot.name ? "Starting..." : "Play"}
            </span>
          </button>
        ))}
      </div>
      <p className="room-feedback" role="status" aria-live="polite">{error}</p>
    </>
  );
}
