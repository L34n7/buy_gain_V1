import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Controle simples de rate limit em memória
const rateLimitMap = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ⛔ RATE LIMIT (1 tentativa por minuto por IP)
    const lastAttempt = rateLimitMap.get(ip);
    const now = Date.now();

    if (lastAttempt && now - lastAttempt < 60000) {
      return NextResponse.json(
        { error: "Aguarde 1 minuto antes de tentar novamente." },
        { status: 429 }
      );
    }

    rateLimitMap.set(ip, now);

    // 🔐 Chama Supabase internamente
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}