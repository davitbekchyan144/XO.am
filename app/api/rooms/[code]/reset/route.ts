import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { code } = await context.params;
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (room.hostId !== user.id && room.guestId !== user.id) {
    return NextResponse.json(
      { error: "You are not a player in this room." },
      { status: 403 },
    );
  }
  if (room.status !== "finished") {
    return NextResponse.json(
      { error: "Finish the current round before starting another." },
      { status: 409 },
    );
  }

  const reset = await prisma.room.updateMany({
    where: { id: room.id, revision: room.revision, status: "finished" },
    data: {
      board: "---------",
      currentMark: "X",
      status: "playing",
      winner: null,
      round: { increment: 1 },
      revision: { increment: 1 },
    },
  });
  if (!reset.count) {
    return NextResponse.json(
      { error: "The room changed. Refresh and try again." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}