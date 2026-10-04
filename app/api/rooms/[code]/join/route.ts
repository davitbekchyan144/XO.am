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
  if (room.hostId === user.id) {
    return NextResponse.json({ error: "You cannot join your own room." }, { status: 409 });
  }
  if (room.guestId === user.id && room.status === "playing") {
    return NextResponse.json({ roomCode: room.code });
  }
  if (room.status !== "waiting" || room.guestId) {
    return NextResponse.json(
      { error: "This room is no longer available." },
      { status: 409 },
    );
  }

  const joined = await prisma.room.updateMany({
    where: { id: room.id, status: "waiting", guestId: null, revision: room.revision },
    data: { guestId: user.id, status: "playing", revision: { increment: 1 } },
  });
  if (!joined.count) {
    return NextResponse.json(
      { error: "This room was just joined by another player." },
      { status: 409 },
    );
  }

  return NextResponse.json({ roomCode: room.code });
}