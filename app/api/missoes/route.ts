import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function GET() {
  try {
    // 1️⃣ Auth do usuário (cookie)
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Admin para acessar tabela users (evita RLS)
    const admin = await createAdminSupabase();

    // 3️⃣ Buscar usuário na tabela app users
    const { data, error: appErr } = await admin
      .from("users")
      .select("profile_completed, profile_completed_at")
      .eq("auth_user_id", user.id)
      .single();

    if (appErr || !data) {
      console.error("Erro Supabase:", appErr);
      return NextResponse.json(
        { error: "Erro ao consultar perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      concluida: data.profile_completed,
      data_conclusao: data.profile_completed_at,
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}