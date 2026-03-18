import { NextResponse } from "next/server";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    let inicio: string | null = null;
    let fim: string | null = null;
    let page = 1;
    let limit = 20;

    try {
      const body = await req.json();
      inicio = body?.inicio ?? null;
      fim = body?.fim ?? null;
      page = Number(body?.page) || 1;
      limit = Number(body?.limit) || 20;
    } catch {
      // se não vier body, usa padrão
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1) usuário autenticado
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

    // 2) admin
    const admin = await createAdminSupabase();

    // 3) auth_user_id -> users.id
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

    // 4) query paginada
    let query = admin
      .from("extrato_pontos")
      .select(
        `
        id,
        tipo,
        origem,
        referencia_id,
        pontos,
        saldo_apos,
        criado_em
      `,
        { count: "exact" }
      )
      .eq("user_id", legacyUser.id)
      .order("criado_em", { ascending: false })
      .range(from, to);

    if (inicio) {
      query = query.gte("criado_em", `${inicio}T00:00:00`);
    }

    if (fim) {
      query = query.lte("criado_em", `${fim}T23:59:59`);
    }

    const { data: extrato, error, count } = await query;

    if (error) {
      console.error("Erro ao buscar extrato:", error);
      return NextResponse.json(
        { error: "Erro ao buscar extrato" },
        { status: 500 }
      );
    }

    if (!extrato || extrato.length === 0) {
      return NextResponse.json({
        data: [],
        count: count || 0,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
      });
    }

    // 5) buscar dados extras dos resgates apenas da página atual
    const resgateIds = extrato
      .filter((e) => e.origem === "RESGATE_RECOMPENSA")
      .map((e) => e.referencia_id);

    let mapaResgates = new Map();

    if (resgateIds.length > 0) {
      const { data: resgates } = await admin
        .from("recompensa_resgates")
        .select(`
          id,
          giftcards ( nome ),
          giftcard_opcoes ( descricao, pontos )
        `)
        .in("id", resgateIds);

      mapaResgates = new Map((resgates || []).map((r) => [r.id, r]));
    }

    const resultado = extrato.map((e) => {
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
      count: count || 0,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    });
  } catch (err) {
    console.error("Erro API extrato:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}