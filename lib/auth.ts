import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieName() {
  return process.env.SESSION_COOKIE_NAME || "xoam_session";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await prisma.session.create({
    data: { tokenHash: tokenHash(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }

  cookieStore.delete(cookieName());
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          wins: true,
          losses: true,
          draws: true,
          points: true,
          darkMode: true,
          soundEnabled: true,
          animationsEnabled: true,
          notifications: true,
          rememberDifficulty: true,
          autoRematch: true,
          selectedDifficulty: true,
          selectedOpponent: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}