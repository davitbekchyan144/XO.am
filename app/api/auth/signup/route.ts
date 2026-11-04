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
  const payload = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) {
    const displayName = typeof payload?.displayName === "string" ? payload.displayName.trim() : "";
    const email = typeof payload?.email === "string" ? payload.email.trim() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (displayName.length < 2 || displayName.length > 24 || !/^[a-zA-Z0-9 _-]+$/.test(displayName)) {
      return NextResponse.json({ error: "Use a display name of 2-24 letters, numbers, spaces, hyphens, or underscores." }, { status: 400 });
    }
    if (!email || email.length > 254 || !z.string().email().safeParse(email).success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: "Password must be 8-72 characters and include a letter and a number." }, { status: 400 });
    }

    return NextResponse.json({ error: "Check your account details and try again." }, { status: 400 });
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