import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function GET() {
  try {
    // 1️⃣ Supabase do usuário (Auth via cookie)
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { saldo: 0 },
        { status: 200 }
      );
    }

    // 2️⃣ Supabase admin (service role)
    const admin = await createAdminSupabase();

    // 3️⃣ Mapear auth.users → public.users
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { saldo: 0 },
        { status: 200 }
      );
    }

    const user_id = legacyUser.id;

    // 4️⃣ Buscar extrato
    const { data: extrato, error: extratoError } = await admin
      .from("extrato_pontos")
      .select("tipo, pontos")
      .eq("user_id", user_id);

    if (extratoError || !extrato) {
      return NextResponse.json(
        { saldo: 0 },
        { status: 200 }
      );
    }

    // 5️⃣ Calcular saldo
    const saldo = extrato.reduce((acc, row) => {
      return row.tipo === "CREDITO"
        ? acc + row.pontos
        : acc - row.pontos;
    }, 0);

    // 🔥 Buscar level do usuário (user_progress)
    const { data: progress, error: progressError } = await admin
      .from("user_progress")
      .select("level")
      .eq("auth_user_id", user.id)
      .single();

    const level = progressError || !progress ? 1 : progress.level;


    return NextResponse.json({
      saldo,
      level,
    });

  } catch (err) {
    console.error("Erro API saldo:", err);
    return NextResponse.json(
      { saldo: 0 },
      { status: 200 }
    );
  }
}
