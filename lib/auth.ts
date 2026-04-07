// Simple cookie-based session for Phase 1.
// Stores { userId } in a signed cookie. Replace with NextAuth or
// Lucia before real traffic.

import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const SESSION_COOKIE = "lr_session";
const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret";

function sign(value: string): string {
  const mac = createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(value).digest("hex");
  return mac === expected ? value : null;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function createSession(userId: string) {
  const token = sign(`${userId}:${randomBytes(8).toString("hex")}`);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const value = verify(raw);
  if (!value) return null;
  const userId = value.split(":")[0];
  return prisma.user.findUnique({
    where: { id: userId },
    include: { brandProfile: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
