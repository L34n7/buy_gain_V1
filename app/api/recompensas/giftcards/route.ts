import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const supabase = await createAdminSupabase(); // 🔥 AQUI ESTAVA O ERRO

    const { data, error } = await supabase
      .from("giftcards")
      .select(`
        id,
        nome,
        imagem,
        imagem_modal,
        descricao,
        giftcard_opcoes (
          id,
          descricao,
          pontos
        )
      `)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar giftcards:", error);
      return NextResponse.json(
        { error: "Erro ao buscar giftcards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (err) {
    console.error("Erro API giftcards:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
