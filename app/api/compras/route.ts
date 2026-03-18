import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

function mapStatusShopee(status?: string) {
  switch (status) {
    case "PENDING":
      return "EM_ANALISE";
    case "COMPLETED":
      return "CONFIRMADO_FINAL";
    case "CANCELLED":
      return "CANCELADO_DEFINITIVO";
    case "UNPAID":
      return "EM_ANALISE";
    default:
      return "EM_ANALISE";
  }
}

export async function POST(req: Request) {
  try {
    let page = 1;
    let limit = 20;

    try {
      const body = await req.json();
      page = Number(body?.page) || 1;
      limit = Number(body?.limit) || 20;
    } catch {
      // se não vier body, usa padrão
    }

    // 1) Supabase do usuário (Auth)
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2) Supabase admin (Service Role)
    const admin = await createAdminSupabase();

    // 3) Mapeia usuário antigo
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    // 4) Buscar eventos Mercado Livre
    const { data: mlEventos, error: mlError } = await admin
      .from("ml_eventos")
      .select(`
        id,
        status,
        data_evento,
        data_update,
        link_rastreado,
        produto_nome,
        produto_imagem,
        produto_vendas,
        ganho_pontos
      `)
      .eq("user_id", user_id)
      .not("status", "in", '("CRIADO","SEM_MATCH")');

    if (mlError) {
      console.error("Erro ml_eventos:", mlError);
      return NextResponse.json(
        { error: "Erro ao buscar eventos do Mercado Livre" },
        { status: 500 }
      );
    }

    // 5) Buscar eventos Shopee
    const { data: shopeeEventos, error: shopeeError } = await admin
      .from("shopee_eventos")
      .select(`
        id,
        status,
        data_evento,
        data_update,
        produto_nome,
        produto_imagem,
        produto_vendas,
        ganho_pontos,
        generate_link:generate_link_id (
          link_rastreado
        )
      `)
      .eq("user_id", user_id);

    if (shopeeError) {
      console.error("Erro shopee_eventos:", shopeeError);
      return NextResponse.json(
        { error: "Erro ao buscar eventos da Shopee" },
        { status: 500 }
      );
    }

    // 6) Mapear Shopee para mesmo formato
    const shopeeFormatado = (shopeeEventos ?? []).map((item: any) => ({
      id: item.id,
      status: mapStatusShopee(item.status),
      data_evento: item.data_evento,
      data_update: item.data_update,
      produto_nome: item.produto_nome,
      produto_imagem: item.produto_imagem,
      produto_vendas: item.produto_vendas,
      ganho_pontos: item.ganho_pontos,
      link_rastreado: item.generate_link?.link_rastreado ?? null,
      marketplace: "SHOPEE" as const,
    }));

    // 7) Mapear ML
    const mlFormatado = (mlEventos || []).map((item: any) => ({
      ...item,
      status: item.status,
      marketplace: "MERCADO_LIVRE" as const,
    }));

    // 8) Unir tudo
    const todosEventos = [...mlFormatado, ...shopeeFormatado];

    // 9) Ordenar por data_evento desc
    todosEventos.sort((a, b) => {
      return (
        new Date(b.data_evento || 0).getTime() -
        new Date(a.data_evento || 0).getTime()
      );
    });

    // 10) Paginar após unir e ordenar
    const count = todosEventos.length;
    const totalPages = Math.max(1, Math.ceil(count / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginaAtual = todosEventos.slice(start, end);

    const conquistasData = await triggerConquistas(admin, user.id);

    return NextResponse.json({
      ...(conquistasData || {}),
      data: paginaAtual,
      count,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error("Erro API compras:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}