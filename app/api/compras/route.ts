import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

type ShopeeEventoComJoin = {
  id: string;
  status: string;
  data_evento: string;
  data_update: string;
  produto_nome: string;
  produto_imagem: string;
  produto_vendas: number;
  ganho_pontos: number;
  generate_link: {
    link_rastreado: string;
  } | null;
};



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


export async function POST() {
  try {
    // 1️⃣ Supabase do usuário (Auth)
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

    // 2️⃣ Supabase admin (Service Role)
    const admin = await createAdminSupabase();

    // 3️⃣ Mapeia usuário antigo
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

// 4️⃣ Buscar eventos Mercado Livre
const { data: mlEventos } = await admin
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


// 5️⃣ Buscar eventos Shopee (com JOIN generate_link)
const { data: shopeeEventos } = await admin
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


// 6️⃣ Mapear Shopee para mesmo formato
const shopeeFormatado = (shopeeEventos ?? []).map((item: any) => ({
  id: item.id,
  status: mapStatusShopee(item.status),
  data_evento: item.data_evento,
  data_update: item.data_update,
  produto_nome: item.produto_nome,
  produto_imagem: item.produto_imagem,
  produto_vendas: item.produto_vendas,
  ganho_pontos: item.ganho_pontos,
  link_rastreado: item.generate_link?.link_rastreado,
}));



// 7️⃣ Mapear ML (garantir consistência)
const mlFormatado = (mlEventos || []).map((item) => ({
  ...item,
  status: item.status
}));


// 8️⃣ Unir tudo
const todosEventos = [...mlFormatado, ...shopeeFormatado];

// 9️⃣ Ordenar por data_evento desc
todosEventos.sort((a, b) => {
  return new Date(b.data_evento || 0).getTime() -
         new Date(a.data_evento || 0).getTime();
});

const conquistasData = await triggerConquistas(admin, user.id);

return NextResponse.json({
  ...(conquistasData || {}),
  data: todosEventos,
  count: todosEventos.length,
});


  } catch (err) {
    console.error("Erro API compras:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
