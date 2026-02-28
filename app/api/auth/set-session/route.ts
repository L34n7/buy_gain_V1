// app/api/auth/set-session/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token;
    const refresh_token = body?.refresh_token;

    console.log("[set-session] body keys:", Object.keys(body || {}));
    if (!access_token) {
      console.log("[set-session] access_token ausente");
      return NextResponse.json({ error: "access_token ausente" }, { status: 400 });
    }

    const res = NextResponse.json({ success: true });

    const isProd = process.env.NODE_ENV === "production";

    // cookie de acesso (curta duração)
    res.cookies.set("sb-access-token", access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    if (refresh_token) {
      res.cookies.set("sb-refresh-token", refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
      });
    }

    console.log("[set-session] cookies set (server)");
    return res;
  } catch (err) {
    console.error("Erro set-session:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
