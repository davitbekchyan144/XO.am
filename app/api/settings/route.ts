import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  darkMode: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  animationsEnabled: z.boolean().optional(),
  notifications: z.boolean().optional(),
  rememberDifficulty: z.boolean().optional(),
  autoRematch: z.boolean().optional(),
  selectedDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  selectedOpponent: z.string().trim().min(1).max(24).optional(),
}).refine((settings) => Object.keys(settings).length > 0);

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }

  const settings = await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  return NextResponse.json({
    settings: {
      darkMode: settings.darkMode,
      soundEnabled: settings.soundEnabled,
      animationsEnabled: settings.animationsEnabled,
      notifications: settings.notifications,
      rememberDifficulty: settings.rememberDifficulty,
      autoRematch: settings.autoRematch,
      selectedDifficulty: settings.selectedDifficulty,
      selectedOpponent: settings.selectedOpponent,
    },
  });
}