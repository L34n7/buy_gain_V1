import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: chamadoId } = await context.params;
    const body = await req.json();

    const nota = Number(body?.nota);
    const mensagem = String(body?.mensagem || "").trim();

    if (!nota || nota < 1 || nota > 5) {
      return NextResponse.json(
        { error: "A nota deve ser um número entre 1 e 5." },
        { status: 400 }
      );
    }

    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const admin = await createAdminSupabase();

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

    const { data: chamado, error: chamadoError } = await admin
      .from("chamados_suporte")
      .select("id, user_id, status, avaliacao_nota")
      .eq("id", chamadoId)
      .eq("user_id", user_id)
      .single();

    if (chamadoError || !chamado) {
      return NextResponse.json(
        { error: "Chamado não encontrado." },
        { status: 404 }
      );
    }

    if (chamado.status !== "FINALIZADO") {
      return NextResponse.json(
        { error: "Só é possível avaliar chamados finalizados." },
        { status: 400 }
      );
    }

    if (chamado.avaliacao_nota !== null) {
      return NextResponse.json(
        { error: "Este chamado já foi avaliado." },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("chamados_suporte")
      .update({
        avaliacao_nota: nota,
        avaliacao_mensagem: mensagem || null,
        avaliado_em: new Date().toISOString(),
      })
      .eq("id", chamadoId);

    if (updateError) {
      console.error("Erro ao salvar avaliação do chamado:", updateError);
      return NextResponse.json(
        { error: "Erro ao salvar avaliação." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Avaliação enviada com sucesso.",
    });
  } catch (err) {
    console.error("Erro API avaliar chamado:", err);
    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}