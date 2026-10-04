import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { boardWinner } from "@/lib/game";
import { prisma } from "@/lib/prisma";

const moveSchema = z.object({
  index: z.number().int().min(0).max(8),
});

function getResult(winnerId: string | null, playerId: string, isDraw: boolean) {
  if (isDraw) return "draw";
  return winnerId === playerId ? "win" : "loss";
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid square." }, { status: 400 });
  }
  const { code } = await context.params;

  try {
    const revision = await prisma.$transaction(async (transaction) => {
      const room = await transaction.room.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          host: { select: { displayName: true } },
          guest: { select: { displayName: true } },
        },
      });
      if (!room) throw new Error("ROOM_NOT_FOUND");

      const mark = room.hostId === user.id
        ? "X"
        : room.guestId === user.id ? "O" : null;
      if (!mark) throw new Error("NOT_A_PLAYER");
      if (room.status !== "playing") throw new Error("MATCH_NOT_PLAYING");
      if (room.currentMark !== mark) throw new Error("NOT_YOUR_TURN");

      const board = room.board.split("");
      if (board[parsed.data.index] !== "-") throw new Error("SQUARE_TAKEN");
      board[parsed.data.index] = mark;

      const winner = boardWinner(board);
      const isDraw = !winner && board.every((cell) => cell !== "-");
      const status = winner || isDraw ? "finished" : "playing";
      const nextMark = mark === "X" ? "O" : "X";
      const updated = await transaction.room.updateMany({
        where: { id: room.id, revision: room.revision, status: "playing" },
        data: {
          board: board.join(""),
          currentMark: nextMark,
          status,
          winner: winner ?? (isDraw ? "draw" : null),
          revision: { increment: 1 },
        },
      });
      if (!updated.count) throw new Error("STALE_MOVE");

      if (status === "finished" && room.guestId) {
        const winnerId = winner === "X" ? room.hostId : winner === "O" ? room.guestId : null;
        const hostResult = getResult(winnerId, room.hostId, isDraw);
        const guestResult = getResult(winnerId, room.guestId, isDraw);
        await transaction.match.createMany({
          data: [
            {
              playerId: room.hostId,
              opponent: room.guest?.displayName ?? "Opponent",
              result: hostResult,
              mode: "online",
            },
            {
              playerId: room.guestId,
              opponent: room.host.displayName,
              result: guestResult,
              mode: "online",
            },
          ],
        });
        for (const [playerId, result] of [[room.hostId, hostResult], [room.guestId, guestResult]] as const) {
          await transaction.user.update({
            where: { id: playerId },
            data: result === "win"
              ? { wins: { increment: 1 }, points: { increment: 1 } }
              : result === "loss"
                ? { losses: { increment: 1 } }
                : { draws: { increment: 1 } },
          });
        }
      }

      return room.revision + 1;
    }, {
      isolationLevel: "Serializable",
    });

    return NextResponse.json({ revision });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const responses: Record<string, [string, number]> = {
      ROOM_NOT_FOUND: ["Room not found.", 404],
      NOT_A_PLAYER: ["You are not a player in this room.", 403],
      MATCH_NOT_PLAYING: ["The match is not accepting moves.", 409],
      NOT_YOUR_TURN: ["It is the other player's turn.", 409],
      SQUARE_TAKEN: ["Choose an empty square.", 409],
      STALE_MOVE: ["The board changed. Refresh the match.", 409],
    };
    const [message, status] = responses[reason] ?? ["The move could not be saved.", 409];
    return NextResponse.json({ error: message }, { status });
  }
}