import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const supabaseUser = await createUserSupabase();
    const admin = await createAdminSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth." },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    const body = await req.json();
    const nota = Number(body?.nota);
    const comentario = String(body?.comentario || "").trim();

    if (!nota || nota < 1 || nota > 5) {
      return NextResponse.json(
        { error: "Selecione uma nota de 1 a 5." },
        { status: 400 }
      );
    }

    const { data: avaliacaoExistente } = await admin
      .from("avaliacoes_plataforma")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (avaliacaoExistente) {
      return NextResponse.json(
        { error: "Você já avaliou a plataforma." },
        { status: 400 }
      );
    }

    const { error: insertError } = await admin
      .from("avaliacoes_plataforma")
      .insert({
        user_id,
        nota,
        comentario: comentario || null,
        origem: "PRIMEIRA_COMPRA_CONCLUIDA",
      });

    if (insertError) {
      console.error("Erro ao salvar avaliação:", insertError);
      return NextResponse.json(
        { error: "Erro ao salvar avaliação." },
        { status: 500 }
      );
    }

    const { error: updateNotifError } = await admin
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("tipo", "AVALIACAO_PLATAFORMA")
      .eq("lida", false);

    if (updateNotifError) {
      console.error("Erro ao marcar notificação de avaliação como lida:", updateNotifError);
    }

    return NextResponse.json({
      success: true,
      message: "Avaliação enviada com sucesso.",
    });
  } catch (err) {
    console.error("Erro API avaliação plataforma:", err);
    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}