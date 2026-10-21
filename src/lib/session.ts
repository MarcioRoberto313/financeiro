import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "fin_session";
const SHORT = 60 * 60 * 12; // 12 horas (e o cookie some ao fechar o navegador)
const LONG = 60 * 60 * 24 * 30; // 30 dias, só com "Manter conectado"
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

/**
 * Abre a sessão. Sem `remember`, o cookie é de sessão do navegador (apagado ao fechá-lo)
 * e o token vale no máximo 12 horas. `version` amarra a sessão à versão atual da senha.
 */
export async function createSession(userId: string, version: number, remember = false) {
  const ttl = remember ? LONG : SHORT;
  const token = await new SignJWT({ userId, v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: LONG } : {}),
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

async function readSession(): Promise<{ userId: string; v: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId, v: typeof payload.v === "number" ? payload.v : 0 };
  } catch {
    return null;
  }
}

/** Usuário logado; redireciona para /login se não houver sessão válida. */
export const requireUser = cache(async () => {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, sessionVersion: true },
  });
  // Senha trocada depois que esta sessão foi aberta: sessão revogada
  if (!user || user.sessionVersion !== session.v) redirect("/login");
  return { id: user.id, name: user.name, email: user.email };
});

/** Id do usuário para Server Actions (reautoriza a cada chamada). */
export async function requireUserId() {
  return (await requireUser()).id;
}

export const SESSION_COOKIE = COOKIE;
