export const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function boardWinner(board: string[]) {
  for (const [first, second, third] of winningLines) {
    const mark = board[first];
    if (mark && mark === board[second] && mark === board[third]) return mark;
  }
  return null;
}

export function matchPointChange(
  result: "win" | "loss" | "draw",
  mode: "ai" | "offline" | "online",
  difficulty?: "easy" | "medium" | "hard",
) {
  if (result === "loss") return -1;
  if (result === "draw") return 0;
  if (mode !== "ai") return 1;
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
}

export function matchStats(user: { wins: number; losses: number; draws: number }) {
  const total = user.wins + user.losses + user.draws;
  if (total >= 20 && user.wins > user.losses * 2) return "Arena Legend";
  if (total >= 10 && user.wins > user.losses) return "Rising Star";
  return "Novice Challenger";
}