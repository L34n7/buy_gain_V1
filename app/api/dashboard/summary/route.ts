/* PUXA DADOS DO USUÁRIO AUTENTICADO (AUTH + USUÁRIO LEGADO) */
import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST() {
  try {
    // 1️⃣ Supabase do usuário (Auth via cookie)
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase ADMIN
    const admin = await createAdminSupabase();

    // 3️⃣ Buscar usuário legado (tabela users)
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    // 4️⃣ Buscar pontos (generate_link)
    const { data: cliques, error: pontosError } = await admin
      .from("generate_link")
      .select("pontos")
      .eq("user_id", user_id);

    if (pontosError) {
      console.error("Erro ao buscar pontos:", pontosError);
      return NextResponse.json(
        { error: "Erro ao buscar pontos" },
        { status: 500 }
      );
    }

    const totalPoints =
      cliques?.reduce((sum, item) => sum + (item.pontos ?? 0), 0) ?? 0;

    // 5️⃣ Retorno final
    return NextResponse.json({
      user_name: legacyUser.name ?? "Minha Conta",
      total_points: totalPoints,
    });

  } catch (err) {
    console.error("Erro API dashboard summary:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Esta rota aceita apenas POST" },
    { status: 405 }
  );
}
