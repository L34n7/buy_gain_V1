import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // verifica se existe algum cookie do Supabase
  const isAuthenticated = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  /* ===============================
     0️⃣ REDIRECIONA RAIZ PARA /dashboard
  =============================== */
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  /* ===============================
     1️⃣ PROTEGE APENAS AS SUBPÁGINAS DO DASHBOARD
     /dashboard fica público
  =============================== */
  const isDashboardInterno = pathname.startsWith("/dashboard/");

  if (isDashboardInterno && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  /* ===============================
     2️⃣ BLOQUEIA LOGIN E CADASTRO SE JÁ LOGADO
  =============================== */
  if (pathname === "/auth/login" || pathname === "/auth/cadastro") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

/* ===============================
   ROTAS MONITORADAS
=============================== */
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/auth/login",
    "/auth/cadastro",
  ],
};