import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "fin_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

async function readUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

/** Usuário logado; redireciona para /login se não houver sessão válida. */
export const requireUser = cache(async () => {
  const userId = await readUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!user) redirect("/login");
  return user;
});

/** Id do usuário para Server Actions (reautoriza a cada chamada). */
export async function requireUserId() {
  return (await requireUser()).id;
}

export const SESSION_COOKIE = COOKIE;
