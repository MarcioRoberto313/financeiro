import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: só confere se o cookie existe. A validação real da sessão
// acontece no servidor (requireUser) perto dos dados.
const PUBLIC = [
  "/login",
  "/cadastro",
  "/confirmar-cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
  "/privacidade",
  "/excluir-conta",
  "/conta-excluida",
  "/.well-known",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("fin_session");
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Não redirecionamos /login -> /dashboard aqui: um cookie expirado ou de usuário
  // removido causaria loop, já que só o servidor sabe se a sessão é válida.
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|pwa-icon|manifest.webmanifest|sw.js|favicon.ico|.*\\.(?:png|svg|ico|html|js)$).*)"],
};
