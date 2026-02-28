import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function GET() {
  try {
    /* ---------------------------------
       1️⃣ Supabase do usuário (auth)
    ---------------------------------- */
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { total_disponiveis: 0, giftcards: [] },
        { status: 200 }
      );
    }

    /* ---------------------------------
       2️⃣ Supabase admin
    ---------------------------------- */
    const admin = await createAdminSupabase();

    /* ---------------------------------
       3️⃣ Mapear auth.users → public.users
    ---------------------------------- */
    const { data: legacyUser, error: legacyError } =
      await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { total_disponiveis: 0, giftcards: [] },
        { status: 200 }
      );
    }

    const user_id = legacyUser.id;

    /* ---------------------------------
       4️⃣ Calcular saldo (MESMA lógica da API saldo)
    ---------------------------------- */
    const { data: extrato, error: extratoError } =
      await admin
        .from("extrato_pontos")
        .select("tipo, pontos")
        .eq("user_id", user_id);

    if (extratoError || !extrato) {
      return NextResponse.json(
        { total_disponiveis: 0, giftcards: [] },
        { status: 200 }
      );
    }

    const saldo = extrato.reduce((acc, row) => {
      return row.tipo === "CREDITO"
        ? acc + row.pontos
        : acc - row.pontos;
    }, 0);

    /* ---------------------------------
       5️⃣ Giftcards ativos
    ---------------------------------- */
    const { data: giftcards, error: giftError } =
      await admin
        .from("giftcard_opcoes")
        .select("id, giftcard_id, descricao, pontos")
        .eq("ativo", true);

    if (giftError || !giftcards) {
      return NextResponse.json(
        { total_disponiveis: 0, giftcards: [] },
        { status: 200 }
      );
    }

    /* ---------------------------------
       6️⃣ Filtrar giftcards resgatáveis
    ---------------------------------- */
    const disponiveis = giftcards.filter(
      (g) => g.pontos <= saldo
    );

    /* ---------------------------------
       7️⃣ Retorno final
    ---------------------------------- */
    return NextResponse.json({
      saldo,
      total_disponiveis: disponiveis.length,
      giftcards: disponiveis,
    });

  } catch (err) {
    console.error("Erro API giftcards:", err);
    return NextResponse.json(
      { total_disponiveis: 0, giftcards: [] },
      { status: 200 }
    );
  }
}
