import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const matchSchema = z.object({
  opponent: z.string().trim().min(1).max(24),
  result: z.enum(["win", "loss", "draw"]),
  mode: z.enum(["ai", "offline"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = matchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid match result." }, { status: 400 });

  const { opponent, result, mode, difficulty } = parsed.data;
  await prisma.$transaction([
    prisma.match.create({ data: { playerId: user.id, opponent, result, mode, difficulty } }),
    prisma.user.update({
      where: { id: user.id },
      data: result === "win"
        ? { wins: { increment: 1 }, points: { increment: 1 } }
        : result === "loss" ? { losses: { increment: 1 } } : { draws: { increment: 1 } },
    }),
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
}