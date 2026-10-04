"use client";

import { useEffect, useRef, useState } from "react";
import { boardWinner } from "@/lib/game";

type MatchMode = "ai" | "offline" | "online";
type MatchResult = "win" | "loss" | "draw";
type MatchUser = { displayName: string; wins: number; losses: number };

function getMatchResult(winner: string, playerMark: string): MatchResult {
  if (winner === "draw") return "draw";
  return winner === playerMark ? "win" : "loss";
}

function getResultMessage(result: MatchResult, opponent: string) {
  switch (result) {
    case "win":
      return "You win the round.";
    case "loss":
      return `${opponent} wins this round.`;
    case "draw":
      return "The match ended in a draw.";
  }
}

function findBestMove(board: string[], difficulty: string) {
  const openSquares = board.flatMap((cell, index) => cell ? [] : [index]);
  if (difficulty !== "hard") {
    const winningMove = (mark: string) => openSquares.find((index) => {
      const next = [...board];
      next[index] = mark;
      return boardWinner(next) === mark;
    });
    const tacticalChance = difficulty === "medium" ? 0.5 : 0.2;
    if (Math.random() < tacticalChance) {
      const tactical = winningMove("O") ?? winningMove("X");
      if (tactical !== undefined) return tactical;
    }
    return openSquares[Math.floor(Math.random() * openSquares.length)];
  }

  function minimax(position: string[], mark: string, depth: number): number {
    const winner = boardWinner(position);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    const available = position.flatMap((cell, index) => cell ? [] : [index]);
    if (!available.length) return 0;

    const scores = available.map((index) => {
      const next = [...position];
      next[index] = mark;
      return minimax(next, mark === "O" ? "X" : "O", depth + 1);
    });
    return mark === "O" ? Math.max(...scores) : Math.min(...scores);
  }

  return openSquares.reduce((best, index) => {
    const next = [...board];
    next[index] = "O";
    const score = minimax(next, "X", 0);
    return score > best.score ? { index, score } : best;
  }, { index: openSquares[0], score: Number.NEGATIVE_INFINITY }).index;
}

export function MatchClient({
  user,
  mode,
  difficulty,
  opponent,
  roomCode,
}: {
  user: MatchUser;
  mode: MatchMode;
  difficulty: string;
  opponent: string;
  roomCode: string;
}) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [gameStatus, setGameStatus] = useState("playing");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [message, setMessage] = useState(mode === "online" ? "Connecting to live room..." : "Your turn");
  const [roomOpponent, setRoomOpponent] = useState("Waiting for player");
  const [onlineMark, setOnlineMark] = useState("");
  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(user.wins);
  const [losses, setLosses] = useState(user.losses);
  const [offlineOpponentWins, setOfflineOpponentWins] = useState(0);
  const [roomWins, setRoomWins] = useState(0);
  const [roomLosses, setRoomLosses] = useState(0);
  const [copied, setCopied] = useState(false);
  const lastRevision = useRef(-1);
  const savedLocalRound = useRef(false);
  const lastOnlineRound = useRef(0);

  useEffect(() => {
    if (mode !== "ai" || gameStatus !== "playing" || currentPlayer !== "O") return;
    const timer = window.setTimeout(() => {
      const index = findBestMove(board, difficulty);
      if (index === undefined) return;
      const nextBoard = [...board];
      nextBoard[index] = "O";
      setBoard(nextBoard);
      const winner = boardWinner(nextBoard);
      if (winner) {
        setResult(winner === "X" ? "win" : "loss");
        setGameStatus("finished");
        setMessage(winner === "X" ? "You win the round." : `${opponent} wins this round.`);
      } else if (nextBoard.every(Boolean)) {
        setResult("draw");
        setGameStatus("finished");
        setMessage("The match ended in a draw.");
      } else {
        setCurrentPlayer("X");
        setMessage("Your turn");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [board, currentPlayer, difficulty, gameStatus, mode, opponent]);

  useEffect(() => {
    if (mode !== "online") return;
    if (!roomCode) {
      setGameStatus("waiting");
      setMessage("This match has no room details. Return to the arena and create or join a room.");
      return;
    }
    let active = true;
    let timer: number | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, { cache: "no-store" });
        const state = await response.json();
        if (!response.ok) throw new Error(state.error || "Room connection failed.");
        if (!active) return;

        setOnlineMark(state.yourMark);
        setRoomOpponent(state.opponentName || "Waiting for player");
        if (state.revision !== lastRevision.current) {
          lastRevision.current = state.revision;
          setBoard(state.board);
          setCurrentPlayer(state.currentPlayer);
          setRound(state.round);
          if (state.round !== lastOnlineRound.current) {
            lastOnlineRound.current = state.round;
            setResult(null);
          }
          if (state.status === "waiting") {
            setGameStatus("waiting");
            setMessage(`Waiting for an opponent. Share room code ${roomCode}.`);
          } else if (state.status === "closed") {
            setGameStatus("finished");
            setResult("loss");
            setMessage("The other player left the match.");
          } else if (state.status === "finished") {
            setGameStatus("finished");
            const matchResult = getMatchResult(state.winner, state.yourMark);
            setResult(matchResult);
            if (matchResult === "win") setRoomWins((value) => value + 1);
            if (matchResult === "loss") setRoomLosses((value) => value + 1);
            setMessage(getResultMessage(matchResult, state.opponentName));
          } else {
            setGameStatus("playing");
            const isYourTurn = state.currentPlayer === state.yourMark;
            setMessage(isYourTurn
              ? `Your turn (${state.yourMark})`
              : `${state.opponentName || "Opponent"}'s turn`);
          }
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Reconnecting to the room...");
      } finally {
        if (active) timer = window.setTimeout(poll, 1000);
      }
    }

    void poll();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [mode, roomCode]);

  useEffect(() => {
    if (!result || mode === "online" || savedLocalRound.current) return;
    savedLocalRound.current = true;
    if (result === "win") setWins((value) => value + 1);
    if (result === "loss") {
      setLosses((value) => value + 1);
      if (mode === "offline") setOfflineOpponentWins((value) => value + 1);
    }
    const match = {
      opponent: mode === "offline" ? "Player 2" : opponent,
      result,
      mode,
      difficulty: mode === "ai" ? difficulty : undefined,
    };
    void fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
  }, [difficulty, mode, opponent, result]);

  function play(index: number) {
    if (gameStatus !== "playing" || board[index]) return;
    if (mode === "ai" && currentPlayer !== "X") return;
    if (mode === "online" && currentPlayer !== onlineMark) return;

    if (mode === "online") {
      void fetch(`/api/rooms/${encodeURIComponent(roomCode)}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      }).then(async (response) => {
        if (!response.ok) setMessage((await response.json()).error || "Move not accepted.");
      }).catch(() => setMessage("Lost connection to the room server."));
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;
    setBoard(nextBoard);
    const winner = boardWinner(nextBoard);
    if (winner) {
      setResult(winner === "X" ? "win" : "loss");
      setGameStatus("finished");
      if (mode === "offline") {
        const winningPlayer = winner === "X" ? "1" : "2";
        setMessage(`Player ${winningPlayer} wins the round.`);
      } else {
        const matchResult = winner === "X" ? "win" : "loss";
        setMessage(getResultMessage(matchResult, opponent));
      }
    } else if (nextBoard.every(Boolean)) {
      setResult("draw");
      setGameStatus("finished");
      setMessage("The match ended in a draw.");
    } else {
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      setCurrentPlayer(nextPlayer);
      if (mode === "offline") {
        const playerNumber = nextPlayer === "X" ? "1" : "2";
        setMessage(`Player ${playerNumber}'s turn`);
      } else {
        setMessage(nextPlayer === "O" ? `${opponent} thinking...` : "Your turn");
      }
    }
  }

  async function resetBoard() {
    if (mode === "online") {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/reset`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Could not start a new round.");
      return;
    }
    setBoard(Array(9).fill(""));
    setCurrentPlayer("X");
    setResult(null);
    setGameStatus("playing");
    setMessage("Your turn");
    savedLocalRound.current = false;
    setRound((value) => value + 1);
  }

  async function goHome() {
    if (mode === "online" && roomCode) {
      await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/leave`, {
        method: "POST",
      });
    }
    window.location.assign("/");
  }

  async function copyRoomCode() {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const rival = {
    ai: opponent,
    offline: "Player 2",
    online: roomOpponent,
  }[mode];
  const playerScore = mode === "online" ? roomWins : wins;
  const localOpponentScore = {
    ai: losses,
    offline: offlineOpponentWins,
    online: roomLosses,
  }[mode];
  const statusTitles: Record<MatchResult, string> = {
    win: "Winner",
    loss: "Round over",
    draw: "Draw",
  };
  const statusTitle = result ? statusTitles[result] : null;

  return (
    <div className="container">
      <main className="match-container">
        <div className="match-banner">
          <span className="panel-kicker">
            {mode === "online"
              ? "Live room"
              : mode === "offline" ? "Local duel" : `${difficulty} challenge`}
          </span>
          <h2>{rival}</h2>
          <p>
            {mode === "online"
              ? `Round ${round} · ${gameStatus === "waiting" ? "Waiting for player" : "Online match"}`
              : "First to three in a row wins."}
          </p>
        </div>

        {mode === "online" && (
          <div className="room-code-panel">
            <span>Room code</span>
            <strong>{roomCode}</strong>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => void copyRoomCode()}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        )}

        <div className="score-section">
          <div className="score-box">
            <div className="score-label">
              You{mode === "online" && onlineMark ? ` (${onlineMark})` : ""}
            </div>
            <div className="score-value">{playerScore}</div>
          </div>
          <div className="versus">vs</div>
          <div className="score-box">
            <div className="score-label">{rival}</div>
            <div className="score-value">{localOpponentScore}</div>
          </div>
        </div>

        <div className="game-card">
          <div className="board" role="group" aria-label="Tic-tac-toe board">
            {board.map((cell, index) => (
              <button
                className={`cell${cell === "O" ? " cell-o" : ""}`}
                key={index}
                type="button"
                aria-label={`Square ${index + 1}${cell ? `, ${cell}` : ", empty"}`}
                disabled={
                  gameStatus !== "playing"
                  || Boolean(cell)
                  || (mode === "ai" && currentPlayer !== "X")
                  || (mode === "online" && currentPlayer !== onlineMark)
                }
                onClick={() => play(index)}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        <div className="game-status" aria-live="polite">
          {statusTitle && <div className="winner-banner">{statusTitle}</div>}
          <div id="gameStatus">{message}</div>
        </div>
        <div className="game-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => void resetBoard()}
            disabled={mode === "online" && gameStatus !== "finished"}
          >
            New round
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => void goHome()}
          >
            Back to arena
          </button>
        </div>
      </main>
    </div>
  );
}