import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const supabaseUser = await createUserSupabase();
    const supabaseAdmin = await createAdminSupabase();

    const {
      giftcard_desejado,
      observacao,
    } = await req.json();

    const nomeLimpo = String(giftcard_desejado || "").trim();
    const observacaoLimpa = String(observacao || "").trim();

    if (!nomeLimpo || nomeLimpo.length < 2) {
      return NextResponse.json(
        { error: "Digite o nome do giftcard desejado." },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { error } = await supabaseAdmin
      .from("giftcard_sugestoes")
      .insert({
        user_id: user.id,
        giftcard_desejado: nomeLimpo,
        observacao: observacaoLimpa || null,
      });

    if (error) {
      console.error("Erro ao salvar sugestão de giftcard:", error);
      return NextResponse.json(
        { error: "Erro ao salvar sugestão." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sugestão enviada com sucesso.",
    });
  } catch (err) {
    console.error("Erro na API sugerir-giftcard:", err);
    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}