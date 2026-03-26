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

    // ✅ visitante: retorna modo guest sem erro
    if (!user || authError) {
      return NextResponse.json({
        is_guest: true,
        user_name: "Visitante",
        total_points: 0,
        level_bonus_percent: 0,
        level_bonus_started_at: null,
        level_bonus_expires_at: null,
        level_bonus_active: false,
      });
    }

    // 2️⃣ Supabase ADMIN
    const admin = await createAdminSupabase();

    // 3️⃣ Buscar usuário legado (tabela users)
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select(`
        id,
        name,
        level_bonus_percent,
        level_bonus_started_at,
        level_bonus_expires_at
      `)
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

    // 5️⃣ Calcular se o bônus está ativo
    const bonusPercent = legacyUser.level_bonus_percent ?? 0;
    const bonusStartedAt = legacyUser.level_bonus_started_at ?? null;
    const bonusExpiresAt = legacyUser.level_bonus_expires_at ?? null;

    const now = new Date();

    const bonusActive =
      bonusPercent > 0 &&
      !!bonusStartedAt &&
      !!bonusExpiresAt &&
      new Date(bonusExpiresAt).getTime() > now.getTime();

    // 6️⃣ Retorno final
    return NextResponse.json({
      is_guest: false,
      user_name: legacyUser.name ?? "Minha Conta",
      total_points: totalPoints,
      level_bonus_percent: bonusPercent,
      level_bonus_started_at: bonusStartedAt,
      level_bonus_expires_at: bonusExpiresAt,
      level_bonus_active: bonusActive,
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