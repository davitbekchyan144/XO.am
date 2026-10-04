import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9 _-]+$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/\d/),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your name, email, and password requirements." }, { status: 400 });
  }

  const displayName = parsed.data.displayName;
  const email = parsed.data.email.toLowerCase();
  try {
    const user = await prisma.user.create({
      data: {
        displayName,
        displayNameKey: displayName.toLowerCase(),
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
      select: { id: true, displayName: true },
    });
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "That email or display name is already registered." },
        { status: 409 },
      );
    }
    throw error;
  }
}