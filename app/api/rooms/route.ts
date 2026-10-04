import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const rooms = await prisma.room.findMany({
    where: {
      status: "waiting",
      hostId: { not: user.id },
      ...(query ? { host: { displayNameKey: { contains: query } } } : {}),
    },
    include: { host: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({
    players: rooms.map((room) => ({
      displayName: room.host.displayName,
      roomCode: room.code,
    })),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    const existing = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (existing) continue;

    const room = await prisma.room.create({ data: { code, hostId: user.id } });
    return NextResponse.json({ roomCode: room.code }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Could not create a room. Try again." },
    { status: 503 },
  );
}