import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "crypto";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session";

function ttlHours(): number {
  const h = parseInt(process.env.SESSION_TTL_HOURS ?? "8", 10);
  return Number.isFinite(h) && h > 0 ? h : 8;
}

/** Constant-time password check against ADMIN_PASSWORD. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function startSession(): Promise<void> {
  const token = await createSessionToken({ sub: "admin", role: "admin" }, ttlHours());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlHours() * 3600,
  });
}

export async function endSession(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Use in server components / actions to enforce auth. */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
