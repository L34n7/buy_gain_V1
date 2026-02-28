import { NextResponse } from "next/server";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {

    let inicio: string | null = null;
    let fim: string | null = null;

    try {
    const body = await req.json();
    inicio = body?.inicio ?? null;
    fim = body?.fim ?? null;
    } catch {
    // 🔥 se não vier body, ignora filtro
    }


    // 1️⃣ Supabase do usuário
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Mapear auth → users
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

    // 4️⃣ Buscar extrato
    let query = admin
    .from("extrato_pontos")
    .select(`
        id,
        tipo,
        origem,
        referencia_id,
        pontos,
        saldo_apos,
        criado_em
    `)
    .eq("user_id", legacyUser.id)
    .order("criado_em", { ascending: false });

    // 🔎 FILTRO POR DATA (SE EXISTIR)
    if (inicio) {
    query = query.gte("criado_em", `${inicio}T00:00:00`);
    }

    if (fim) {
    query = query.lte("criado_em", `${fim}T23:59:59`);
    }

    // 🚀 EXECUTA A QUERY
    const { data: extrato } = await query;


    if (!extrato || extrato.length === 0) {
    return NextResponse.json({ data: [] });
    }

    // pega só os referencia_id de resgates
    const resgateIds = extrato
    .filter(e => e.origem === "RESGATE_RECOMPENSA")
    .map(e => e.referencia_id);

    // busca dados do resgate
    const { data: resgates } = await admin
    .from("recompensa_resgates")
    .select(`
        id,
        giftcards ( nome ),
        giftcard_opcoes ( descricao, pontos )
    `)
    .in("id", resgateIds);

    const mapaResgates = new Map(
    (resgates || []).map(r => [r.id, r])
    );

    const resultado = extrato.map(e => {
    if (e.origem === "RESGATE_RECOMPENSA") {
        return {
        ...e,
        resgate: mapaResgates.get(e.referencia_id) || null,
        };
    }

    return e;
    });

    return NextResponse.json({
    data: resultado,
    });


  } catch (err) {
    console.error("Erro API extrato:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
