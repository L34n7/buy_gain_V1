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
      .select("id, auth_user_id, profile_completed, profile_completed_at, codigo_indicacao")
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

    const { data: grupoWhatsapp, error: grupoWhatsappErr } = await admin
      .from("whatsapp_grupo_codigos")
      .select("id, criado_em")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (grupoWhatsappErr) {
      console.error("Erro ao consultar missão Grupo WhatsApp:", grupoWhatsappErr);
      return NextResponse.json(
        { error: "Erro ao consultar missão do Grupo WhatsApp" },
        { status: 500 }
      );
    }

    const {
      data: indicacoes,
      error: indicacoesError,
    } = await admin
      .from("indicacoes_recompensas")
      .select("id, criada_em, liberada_em, status")
      .eq("indicador_user_id", legacyUser.id)
      .eq("status", "LIBERADA")
      .order("liberada_em", { ascending: true });

    if (indicacoesError) {
      console.error("Erro ao consultar indicações:", indicacoesError);
      return NextResponse.json(
        { error: "Erro ao consultar missão de indicação" },
        { status: 500 }
      );
    }

    const totalConfirmadas = indicacoes?.length ?? 0;
    const primeiraIndicacao = indicacoes?.[0] ?? null;

    return NextResponse.json({
      perfil_completo: {
        concluida: !!legacyUser.profile_completed,
        data_conclusao: legacyUser.profile_completed_at ?? null,
      },
      seguir_instagram: {
        concluida: !!instagram,
        data_conclusao: instagram?.criado_em ?? null,
      },
      grupo_whatsapp: {
        concluida: !!grupoWhatsapp,
        data_conclusao: grupoWhatsapp?.criado_em ?? null,
      },
      indicacao: {
        codigo_indicacao: legacyUser.codigo_indicacao ?? null,
        total_confirmadas: totalConfirmadas,
        concluida: totalConfirmadas >= 1,
        data_conclusao:
          primeiraIndicacao?.liberada_em ??
          primeiraIndicacao?.criada_em ??
          null,
        pontos_por_indicacao: 250,
        pontos_indicado: 250,
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