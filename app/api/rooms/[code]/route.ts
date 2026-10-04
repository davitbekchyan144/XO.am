import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { code } = await context.params;
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { host: { select: { displayName: true } }, guest: { select: { displayName: true } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const yourMark = room.hostId === user.id ? "X" : room.guestId === user.id ? "O" : null;
  if (!yourMark) return NextResponse.json({ error: "You are not a player in this room." }, { status: 403 });

  return NextResponse.json({
    roomCode: room.code,
    board: room.board.split("").map((cell) => cell === "-" ? "" : cell),
    yourMark,
    opponentName: yourMark === "X" ? room.guest?.displayName ?? null : room.host.displayName,
    currentPlayer: room.currentMark,
    status: room.status,
    winner: room.winner,
    round: room.round,
    revision: room.revision,
  });
}