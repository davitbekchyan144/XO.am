import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ friendId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { friendId } = await context.params;
  await prisma.friendship.deleteMany({ where: { userId: user.id, friendId } });
  return NextResponse.json({ ok: true });
}