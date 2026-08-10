import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pms_session";

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loudly in dev; middleware will treat as unauthenticated in prod.
    throw new Error("SESSION_SECRET is missing or too short (min 16 chars).");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // "admin"
  role: "admin";
}

export async function createSessionToken(
  payload: SessionPayload,
  ttlHours = 8
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "admin") return null;
    return { sub: String(payload.sub ?? "admin"), role: "admin" };
  } catch {
    return null;
  }
}
