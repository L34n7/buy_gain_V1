import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST() {
  try {
    // 1️⃣ Supabase do usuário (sessão)
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

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Chamar função SQL
    const { data, error: rpcError } = await admin.rpc(
      "give_daily_login_xp",
      { p_auth_user_id: user.id }
    );

    if (rpcError) {
      console.error("Erro RPC daily login:", rpcError);
      return NextResponse.json(
        { error: "Erro ao aplicar XP diário" },
        { status: 500 }
      );
    }

    // 🔥 4️⃣ Se subiu de nível → criar notificação
    if (data?.leveled_up && data?.new_level) {
      const { error: notifError } = await admin
        .from("notificacoes")
        .insert({
          user_id: user.id,
          tipo: "LEVEL_UP",
          titulo: "🚀 Novo nível alcançado!",
          descricao: `Você alcançou o nível ${data.new_level} e desbloqueou uma recompensa especial! +5% de pontos por 3 dias.`,
          lida: false,
        });

      if (notifError) {
        console.error("Erro ao inserir notificação level up (daily):", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      ...data, // gained, leveled_up, new_level
    });

  } catch (err) {
    console.error("Erro API daily-login:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
