import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";
import { criarNotificacaoAvaliacaoSePrimeiraCompra } from "@/lib/notificacoes/criarNotificacaoAvaliacao";
import { enviarEmailAvaliacaoSeNecessario } from "@/lib/email/enviar-email-avaliacao";

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

    const admin = await createAdminSupabase();

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

    const resultadoAvaliacao = await criarNotificacaoAvaliacaoSePrimeiraCompra({
      supabaseAdmin: admin,
      appUserId: user_id,
      authUserId: user.id,
    });

    if (resultadoAvaliacao?.criada) {
      await enviarEmailAvaliacaoSeNecessario({
        supabaseAdmin: admin,
        appUserId: user_id,
      });
    }

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
        generate_link_id,
        generate_link:generate_link_id (
          id,
          link_rastreado,
          bonus_percent,
          bonus_source
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

    const linksMl = (mlEventos ?? [])
      .map((item: any) => item.link_rastreado)
      .filter(Boolean);

    let bonusMap = new Map<string, { bonus_percent: number; bonus_source: string | null }>();

    if (linksMl.length > 0) {
      const { data: linksBonus, error: bonusError } = await admin
        .from("generate_link")
        .select("link_rastreado, bonus_percent, bonus_source")
        .in("link_rastreado", linksMl);

      if (bonusError) {
        console.error("Erro ao buscar bônus ML em generate_link:", bonusError);
      } else {
        bonusMap = new Map(
          (linksBonus ?? []).map((row: any) => [
            row.link_rastreado,
            {
              bonus_percent: Number(row.bonus_percent ?? 0),
              bonus_source: row.bonus_source ?? null,
            },
          ])
        );
      }
    }

    const shopeeFormatado = (shopeeEventos ?? []).map((item: any) => {
      const bonusPercent = Number(item.generate_link?.bonus_percent ?? 0);
      const bonusSource = item.generate_link?.bonus_source ?? null;
      const temBonus = bonusPercent > 0 && !!bonusSource;

      return {
        id: item.id,
        status: mapStatusShopee(item.status),
        data_evento: item.data_evento,
        data_update: item.data_update,
        produto_nome: item.produto_nome,
        produto_imagem: item.produto_imagem,
        produto_vendas: item.produto_vendas,
        ganho_pontos: item.ganho_pontos,
        link_rastreado: item.generate_link?.link_rastreado ?? null,
        bonus_percent: bonusPercent,
        bonus_source: bonusSource,
        tem_bonus: temBonus,
        marketplace: "SHOPEE" as const,
      };
    });

    const mlFormatado = (mlEventos || []).map((item: any) => {
      const bonusInfo = bonusMap.get(item.link_rastreado ?? "");
      const bonusPercent = Number(bonusInfo?.bonus_percent ?? 0);
      const bonusSource = bonusInfo?.bonus_source ?? null;
      const temBonus = bonusPercent > 0 && !!bonusSource;

      return {
        ...item,
        status: item.status,
        bonus_percent: bonusPercent,
        bonus_source: bonusSource,
        tem_bonus: temBonus,
        marketplace: "MERCADO_LIVRE" as const,
      };
    });

    const todosEventos = [...mlFormatado, ...shopeeFormatado];

    todosEventos.sort((a, b) => {
      return (
        new Date(b.data_evento || 0).getTime() -
        new Date(a.data_evento || 0).getTime()
      );
    });

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