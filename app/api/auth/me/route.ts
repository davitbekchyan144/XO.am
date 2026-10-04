import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { matchStats } from "@/lib/game";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [recentMatches, friendships] = await Promise.all([
    prisma.match.findMany({
      where: { playerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.friendship.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    user,
    rank: matchStats(user),
    recentMatches,
    friendCount: friendships,
  });
}