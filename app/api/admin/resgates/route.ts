// app/api/admin/resgates/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const admin = await createAdminSupabase();

    // 1️⃣ Buscar resgates pendentes (SEM JOIN)
    const { data: resgates, error } = await admin
      .from("recompensa_resgates")
      .select("id, user_id, giftcard_id, giftcard_opcao_id, pontos_usados, status, criado_em")
      .eq("status", "PENDENTE")
      .order("criado_em", { ascending: true });

    if (error) {
      console.error("Erro buscar resgates:", error);
      return NextResponse.json({ error: "Erro ao buscar resgates" }, { status: 500 });
    }

    if (!resgates || resgates.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2️⃣ Buscar usuários
    const userIds = [...new Set(resgates.map(r => r.user_id))];

    const { data: users } = await admin
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) ?? []);

    // 3️⃣ Buscar giftcards
    const giftcardIds = [...new Set(resgates.map(r => r.giftcard_id))];

    const { data: giftcards } = await admin
      .from("giftcards")
      .select("id, nome")
      .in("id", giftcardIds);

    const giftcardMap = new Map(giftcards?.map(g => [g.id, g]) ?? []);

    // 4️⃣ Buscar opções
    const opcaoIds = [...new Set(resgates.map(r => r.giftcard_opcao_id))];

    const { data: opcoes } = await admin
      .from("giftcard_opcoes")
      .select("id, descricao")
      .in("id", opcaoIds);

    const opcaoMap = new Map(opcoes?.map(o => [o.id, o]) ?? []);

    // 5️⃣ Montar resposta final
    const resultado = resgates.map(r => ({
      id: r.id,
      status: r.status,
      pontos_usados: r.pontos_usados,
      criado_em: r.criado_em,
      user: userMap.get(r.user_id) ?? null,
      giftcard: giftcardMap.get(r.giftcard_id) ?? null,
      opcao: opcaoMap.get(r.giftcard_opcao_id) ?? null,
    }));

    return NextResponse.json({ data: resultado });

  } catch (err) {
    console.error("Erro admin resgates:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
