import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

const MISSAO_INSTAGRAM = "seguir_instagram";

export async function GET() {
  try {
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const admin = createAdminSupabase();

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id, profile_completed, profile_completed_at")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      console.error("Erro ao consultar usuário:", legacyError);
      return NextResponse.json(
        { error: "Erro ao consultar usuário" },
        { status: 500 }
      );
    }

    const { data: instagram, error: instaErr } = await admin
      .from("instagram_codigos")
      .select("id, criado_em")
      .eq("user_id", legacyUser.id)
      .eq("missao", MISSAO_INSTAGRAM)
      .maybeSingle();

    if (instaErr) {
      console.error("Erro ao consultar missão Instagram:", instaErr);
      return NextResponse.json(
        { error: "Erro ao consultar missão do Instagram" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      perfil_completo: {
        concluida: !!legacyUser.profile_completed,
        data_conclusao: legacyUser.profile_completed_at ?? null,
      },
      seguir_instagram: {
        concluida: !!instagram,
        data_conclusao: instagram?.criado_em ?? null,
      },
    });
  } catch (err) {
    console.error("Erro interno GET /api/missoes:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}