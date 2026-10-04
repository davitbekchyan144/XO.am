import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const friendSchema = z.object({ displayName: z.string().trim().min(2).max(24) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: { userId: user.id },
    include: {
      friend: {
        select: {
          id: true,
          displayName: true,
          hostedRooms: { where: { status: "waiting" }, select: { code: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ friends: friendships.map(({ friend }) => ({
    id: friend.id,
    displayName: friend.displayName,
    roomCode: friend.hostedRooms[0]?.code ?? null,
  })) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = friendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid player name." }, { status: 400 });

  const friend = await prisma.user.findUnique({
    where: { displayNameKey: parsed.data.displayName.toLowerCase() },
    select: { id: true, displayName: true },
  });
  if (!friend || friend.id === user.id) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  try {
    await prisma.friendship.create({ data: { userId: user.id, friendId: friend.id } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That player is already in your friends list." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ friend }, { status: 201 });
}