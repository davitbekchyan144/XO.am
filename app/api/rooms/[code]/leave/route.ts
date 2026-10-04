import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { code } = await context.params;
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostId !== user.id && room.guestId !== user.id) {
    return NextResponse.json({ error: "You are not a player in this room." }, { status: 403 });
  }

  await prisma.room.updateMany({ where: { id: room.id, revision: room.revision }, data: { status: "closed", revision: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}