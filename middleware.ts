import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔑 Cookie padrão do Supabase Auth
  const isAuthenticated = !!request.cookies.get("sb-access-token");

  /* ===============================
     1️⃣ PROTEGE O DASHBOARD
  =============================== */
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(
        new URL("/auth/login", request.url)
      );
    }
  }

  /* ===============================
     2️⃣ BLOQUEIA LOGIN E CADASTRO SE JÁ LOGADO
  =============================== */
  if (pathname === "/auth/login" || pathname === "/auth/cadastro") {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }
  }

  // ✅ continua normalmente
  return NextResponse.next();
}

/* ===============================
   ROTAS MONITORADAS
=============================== */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/login",
    "/auth/cadastro",
  ],
};
