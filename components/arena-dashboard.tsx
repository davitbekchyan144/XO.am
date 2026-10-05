"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type ArenaUser = {
  id: string;
  displayName: string;
  wins: number;
  points: number;
  selectedDifficulty: string;
  selectedOpponent: string;
};

type RoomPlayer = {
  displayName: string;
  roomCode: string;
};

type Friend = {
  id: string;
  displayName: string;
  roomCode: string | null;
};

type MatchMode = {
  label: string;
  mode: "ai" | "offline";
  difficulty: string;
  text: string;
  image: string;
  imageAlt: string;
};

const opponents = [
  { name: "David", difficulty: "medium" },
  { name: "Alex", difficulty: "easy" },
  { name: "Mason", difficulty: "medium" },
  { name: "Ryan", difficulty: "hard" },
  { name: "Ethan", difficulty: "easy" },
  { name: "Noah", difficulty: "medium" },
  { name: "Lucas", difficulty: "hard" },
  { name: "Daniel", difficulty: "easy" },
  { name: "James", difficulty: "medium" },
  { name: "Leo", difficulty: "hard" },
  { name: "Kai", difficulty: "easy" },
  { name: "Victor", difficulty: "medium" },
  { name: "Nolan", difficulty: "hard" },
  { name: "Aiden", difficulty: "easy" },
  { name: "Theo", difficulty: "hard" },
  { name: "Ivy", difficulty: "easy" },
  { name: "Orion", difficulty: "medium" },
  { name: "Pixel", difficulty: "hard" },
  { name: "Blaze", difficulty: "hard" },
  { name: "Zara", difficulty: "medium" },
  { name: "Atlas", difficulty: "hard" },
  { name: "Echo", difficulty: "easy" },
  { name: "Jett", difficulty: "medium" },
  { name: "Skye", difficulty: "easy" },
];

const rankNames: Record<string, string> = {
  easy: "Novice",
  medium: "Legendary",
  hard: "Master",
};

const matchModes: MatchMode[] = [
  {
    label: "Quick match",
    mode: "ai",
    difficulty: "medium",
    text: "Challenge a dynamic AI rival in a sharp, fast round.",
    image: "https://images.pexels.com/photos/28454507/pexels-photo-28454507.jpeg?auto=compress&cs=tinysrgb&w=900",
    imageAlt: "Tic-tac-toe board on a dark surface",
  },
  {
    label: "Ranked duel",
    mode: "ai",
    difficulty: "hard",
    text: "Face the toughest rival when you need a real test.",
    image: "https://images.pexels.com/photos/29422541/pexels-photo-29422541.jpeg?auto=compress&cs=tinysrgb&w=900",
    imageAlt: "Modern glass tic-tac-toe board",
  },
  {
    label: "Practice",
    mode: "ai",
    difficulty: "easy",
    text: "Build rhythm and confidence at your own pace.",
    image: "https://images.pexels.com/photos/11986168/pexels-photo-11986168.jpeg?auto=compress&cs=tinysrgb&w=900",
    imageAlt: "Colorful tic-tac-toe game outdoors",
  },
  {
    label: "Offline duel",
    mode: "offline",
    difficulty: "medium",
    text: "Play a local two-player match on the same device.",
    image: "https://images.pexels.com/photos/8111352/pexels-photo-8111352.jpeg?auto=compress&cs=tinysrgb&w=900",
    imageAlt: "Friends playing a board game together",
  },
];

export function ArenaDashboard({ user }: { user: ArenaUser }) {
  const [difficulty, setDifficulty] = useState(user.selectedDifficulty);
  const [opponent, setOpponent] = useState(user.selectedOpponent);
  const [rooms, setRooms] = useState<RoomPlayer[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [serverOnline, setServerOnline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function refreshLobby() {
      try {
        const [roomResponse, friendResponse] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/friends"),
        ]);
        if (!active) return;

        if (roomResponse.ok) {
          setRooms((await roomResponse.json()).players);
        }
        if (friendResponse.ok) {
          setFriends((await friendResponse.json()).friends);
        }
        setServerOnline(roomResponse.ok);
      } catch {
        if (active) setServerOnline(false);
      }
    }

    void refreshLobby();
    const timer = window.setInterval(refreshLobby, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function updatePreference(values: {
    selectedDifficulty?: string;
    selectedOpponent?: string;
  }) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }

  async function searchRooms(search = query) {
    try {
      const response = await fetch(`/api/rooms?q=${encodeURIComponent(search)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not search rooms.");
      setRooms(result.players);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not search rooms.");
    }
  }

  async function enterRoom(action: "create" | "join", code?: string) {
    setBusy(true);
    setFeedback(action === "create" ? "Creating room..." : "Joining room...");

    try {
      const response = action === "create"
        ? await fetch("/api/rooms", { method: "POST" })
        : await fetch(`/api/rooms/${encodeURIComponent(code ?? "")}/join`, {
            method: "POST",
          });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not enter that room.");

      window.location.assign(
        `/match?mode=online&room=${encodeURIComponent(result.roomCode)}`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not enter that room.");
      setBusy(false);
    }
  }

  async function addFriend(displayName: string) {
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const result = await response.json();
    if (!response.ok) {
      setFeedback(result.error || "Could not add that friend.");
      return;
    }

    const friendsResponse = await fetch("/api/friends");
    if (friendsResponse.ok) {
      setFriends((await friendsResponse.json()).friends);
    }
  }

  async function removeFriend(friendId: string) {
    await fetch(`/api/friends/${friendId}`, { method: "DELETE" });
    setFriends((current) => current.filter((friend) => friend.id !== friendId));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchRooms();
  }

  function startMatch(mode: "ai" | "offline", selectedDifficulty = difficulty) {
    if (mode === "ai") {
      void updatePreference({ selectedDifficulty });
    }

    const search = new URLSearchParams({
      mode,
      difficulty: selectedDifficulty,
      opponent,
    });
    window.location.assign(`/match?${search.toString()}`);
  }

  function selectOpponent(name: string) {
    setOpponent(name);
    void updatePreference({ selectedOpponent: name });
  }

  const rank = rankNames[difficulty] || rankNames.medium;

  return (
    <div className="container">
      <main className="main-content dashboard">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">XO.am Arena</span>
            <h1>Play a friend. Challenge the AI.</h1>
            <p>Choose a rival, test your tactics, or open a room for a live match.</p>
            <div className="hero-actions">
              <a className="btn-primary" href="#liveArena">Play a friend</a>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => startMatch("ai")}
              >
                Quick AI match
              </button>
            </div>
          </div>
          <div className="hero-preview">
            <div className="status-badge">
              {serverOnline ? "Live rooms ready" : "AI arena ready"}
            </div>
            <div className="preview-panel">
              <div className="mini-avatar" aria-hidden="true" />
              <div className="preview-meta">
                <span className="preview-label">Selected rival</span>
                <h3>{opponent}</h3>
                <span className="preview-rank">{rank} rank</span>
              </div>
            </div>
            <div className="hero-metrics">
              <div className="metric-box">
                <span>Match types</span>
                <strong>AI + live</strong>
              </div>
              <div className="metric-box">
                <span>Players per room</span>
                <strong>2</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="overview-grid">
          <div className="profile-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Player profile</span>
                <h2>Welcome, {user.displayName}</h2>
              </div>
              <span className="profile-pill">Cloud profile</span>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Wins</span>
                <span className="stat-value">{user.wins}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Points</span>
                <span className="stat-value">{user.points}</span>
              </div>
            </div>
          </div>
          <div className="challenge-panel">
            <div className="difficulty-picker">
              <label htmlFor="lobbyDifficulty">Choose challenge</label>
              <select
                id="lobbyDifficulty"
                value={difficulty}
                onChange={(event) => {
                  setDifficulty(event.target.value);
                  void updatePreference({ selectedDifficulty: event.target.value });
                }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="opponent-panel">
              <h3>Opponent</h3>
              <div className="opponent-card">
                <div className="opponent-avatar" aria-hidden="true" />
                <div className="opponent-name">{opponent}</div>
                <div className="opponent-rank">{rank} rank</div>
              </div>
            </div>
          </div>
        </section>

        <section className="online-room-panel" id="liveArena">
          <div className="online-room-heading">
            <div>
              <span className="panel-kicker">Live multiplayer</span>
              <h2>Open rooms</h2>
            </div>
            <span className="status-badge">
              {serverOnline ? "Connected" : "Reconnecting"}
            </span>
          </div>
          <p>Create a room and share its code, or find a player who is waiting.</p>
          <form className="player-search-form" onSubmit={submitSearch}>
            <label htmlFor="playerSearchInput">Find a player</label>
            <input
              id="playerSearchInput"
              type="search"
              maxLength={24}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by arena name"
            />
            <button className="btn-secondary" type="submit">Search</button>
          </form>
          <div className="player-search-results" aria-live="polite">
            {rooms.length === 0 ? (
              <p>No waiting players right now.</p>
            ) : rooms.map((player) => {
              const normalizedName = player.displayName.toLowerCase();
              const alreadyFriend = friends.some(
                (friend) => friend.displayName.toLowerCase() === normalizedName,
              );

              return (
                <div className="player-search-result" key={player.roomCode}>
                  <div>
                    <span className="player-search-name">{player.displayName}</span>
                    <span className="player-search-room">
                      Room {player.roomCode} · Waiting
                    </span>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => void enterRoom("join", player.roomCode)}
                    >
                      Join
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={alreadyFriend}
                      onClick={() => void addFriend(player.displayName)}
                    >
                      {alreadyFriend ? "Added" : "Add friend"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="friends-section" aria-labelledby="friendsHeading">
            <div className="friends-heading">
              <h3 id="friendsHeading">Friends</h3>
              <span>{friends.length} saved</span>
            </div>
            <div className="friend-list" aria-live="polite">
              {friends.length === 0 ? (
                <p>Find a player with an open room to add them here.</p>
              ) : friends.map((friend) => (
                <div className="friend-row" key={friend.id}>
                  <div>
                    <span className="player-search-name">{friend.displayName}</span>
                    <span className={`player-search-room${friend.roomCode ? " friend-online" : ""}`}>
                      {friend.roomCode ? "Waiting in a room" : "Offline"}
                    </span>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={!friend.roomCode || busy}
                      onClick={() => {
                        if (friend.roomCode) void enterRoom("join", friend.roomCode);
                      }}
                    >
                      Join
                    </button>
                    <button
                      className="friend-remove"
                      type="button"
                      aria-label={`Remove ${friend.displayName}`}
                      onClick={() => void removeFriend(friend.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="online-room-controls">
            <button
              className="btn-primary"
              type="button"
              disabled={busy}
              onClick={() => void enterRoom("create")}
            >
              Create room
            </button>
            <div className="room-join-controls">
              <label htmlFor="roomCodeInput">Room code</label>
              <input
                id="roomCodeInput"
                type="text"
                maxLength={6}
                value={roomCode}
                onChange={(event) => setRoomCode(
                  event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                )}
                placeholder="ABC123"
              />
              <button
                className="btn-secondary"
                type="button"
                disabled={busy || roomCode.length !== 6}
                onClick={() => void enterRoom("join", roomCode)}
              >
                Join room
              </button>
            </div>
          </div>
          <p className="room-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        </section>

        <section className="mode-cards">
          <div className="section-heading">
            <h2>Arena modes</h2>
            <span>Choose your intensity</span>
          </div>
          <div className="cards-grid">
            {matchModes.map((mode) => (
              <ModeCard
                key={mode.label}
                mode={mode}
                onPlay={() => startMatch(mode.mode, mode.difficulty)}
              />
            ))}
          </div>
        </section>

        <section className="opponent-roster">
          <div className="section-heading">
            <h2>Opponent roster</h2>
            <span>Select a rival</span>
          </div>
          <div className="roster-grid">
            {opponents.map((item) => (
              <button
                className={`roster-card${opponent === item.name ? " active" : ""}`}
                key={item.name}
                type="button"
                onClick={() => selectOpponent(item.name)}
              >
                <span className="roster-avatar">{item.name[0]}</span>
                <span className="roster-name">{item.name}</span>
                <span className="roster-tier">{rankNames[item.difficulty]}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="dashboard-record-link">
          <Link href="/records">View all match records</Link>
        </p>
      </main>
    </div>
  );
}

function ModeCard({ mode, onPlay }: { mode: MatchMode; onPlay: () => void }) {
  return (
    <article className="mode-card">
      <div className="mode-card-image">
        <Image
          src={mode.image}
          alt={mode.imageAlt}
          fill
          sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 25vw"
        />
      </div>
      <h3>{mode.label}</h3>
      <p>{mode.text}</p>
      <button className="btn-primary" type="button" onClick={onPlay}>
        {mode.mode === "offline" ? "Play offline" : "Play now"}
      </button>
    </article>
  );
}
