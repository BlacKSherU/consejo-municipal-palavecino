import * as jose from "jose";
import type { Env } from "./env";

export type JwtPayload = { sub: string; email: string };

export async function signToken(env: Env, userId: number, email: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(env: Env, token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub;
    const email = payload.email;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return { sub, email };
  } catch {
    return null;
  }
}
