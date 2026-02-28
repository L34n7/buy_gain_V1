import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

export async function GET() {
  try {
    // 1️⃣ Supabase usuário
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Resolver public.users
    const { data: legacyUser } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!legacyUser) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    // 4️⃣ Buscar resgates
    const { data: resgates } = await admin
      .from("recompensa_resgates")
      .select(`
        id,
        status,
        pontos_usados,
        criado_em,
        processado_em,
        giftcard:giftcard_id (
          nome,
          imagem
        ),
        opcao:giftcard_opcao_id (
          descricao
        ),
        codigo:recompensa_codigos (
          codigo
        )
      `)
      .eq("user_id", user_id)
      .order("criado_em", { ascending: false });

      const conquistasData = await triggerConquistas(admin, user.id);

    return NextResponse.json({
      ...(conquistasData || {}),
      data: resgates || [],
    });

  } catch (err) {
    console.error("Erro inventário:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
