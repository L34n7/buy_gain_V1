import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";

const APP_ID = process.env.SHOPEE_APP_ID!;
const SECRET = process.env.SHOPEE_SECRET!;
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

function extractProductData(url: string) {
  // formato /product/shopId/itemId
  const productMatch = url.match(/product\/(\d+)\/(\d+)/);
  if (productMatch) {
    return {
      shopId: productMatch[1],
      itemId: productMatch[2],
    };
  }

  // formato compartilhamento -i.shopId.itemId
  const shareMatch = url.match(/-i\.(\d+)\.(\d+)/);
  if (shareMatch) {
    return {
      shopId: shareMatch[1],
      itemId: shareMatch[2],
    };
  }

  return null;
}

function generateSignature(payload: string, timestamp: string) {
  const factor = APP_ID + timestamp + payload + SECRET;
  return crypto.createHash("sha256").update(factor, "utf8").digest("hex");
}

function hexToUUID(hex: string) {
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join("-");
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = await createUserSupabase();
    const supabaseAdmin = await createAdminSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }

    const { data: appUser, error: appErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appErr || !appUser) {
      return NextResponse.json({ error: "Usuário não encontrado na tabela users" }, { status: 404 });
    }

    const { originUrl } = await req.json();
    if (!originUrl) {
      return NextResponse.json({ error: "originUrl é obrigatório" }, { status: 400 });
    }

    const extracted = extractProductData(originUrl);

    if (!extracted) {
      return NextResponse.json(
        { error: "URL da Shopee inválida" },
        { status: 400 }
      );
    }

    const { shopId, itemId } = extracted;

    // 🔥 reconstruir link limpo
    const originUrlLimpa = `https://shopee.com.br/product/${shopId}/${itemId}`;


    // 1) Buscar produto
    const productQuery = {
      query: `
        query {
          productOfferV2(itemId: ${itemId}, page: 1, limit: 1) {
            nodes {
              itemId
              productName
              imageUrl
              commissionRate
              priceMin
              priceMax
              productCatIds
            }
          }
        }
      `,
      variables: null,
    };

    const productPayload = JSON.stringify(productQuery);
    const timestamp1 = Math.floor(Date.now() / 1000).toString();
    const signature1 = generateSignature(productPayload, timestamp1);

    const productRes = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${APP_ID}, Timestamp=${timestamp1}, Signature=${signature1}`,
      },
      body: productPayload,
    });

    const productData = await productRes.json();
    const produto = productData?.data?.productOfferV2?.nodes?.[0];

    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado na Shopee Affiliate" }, { status: 404 });
    }

    // 2) Gerar ids
    const hexId = crypto.randomBytes(16).toString("hex"); // enviado pra Shopee
    const generateLinkUUID = hexToUUID(hexId); // salvo no DB com hífens

    // 3) Gerar short link usando variáveis GraphQL
    const shortQuery = {
      query: `
        mutation GenerateShortLink($originUrl: String!, $subIds: [String!]) {
          generateShortLink(
            input: {
              originUrl: $originUrl,
              subIds: $subIds
            }
          ) {
            shortLink
          }
        }
      `,
      variables: {
        originUrl: originUrlLimpa,
        subIds: [hexId],
      },
    };

    const shortPayload = JSON.stringify(shortQuery);
    const timestamp2 = Math.floor(Date.now() / 1000).toString();
    const signature2 = generateSignature(shortPayload, timestamp2);

    const shortRes = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${APP_ID}, Timestamp=${timestamp2}, Signature=${signature2}`,
      },
      body: shortPayload,
    });

    const shortData = await shortRes.json();
    const shortLink = shortData?.data?.generateShortLink?.shortLink;

    if (!shortLink) {
      console.error("SHORT LINK ERROR:", shortData);
      return NextResponse.json({ error: "Erro ao gerar short link" }, { status: 500 });
    }

    // 4) Cálculo min/max e pontos
    const priceMin = Number(produto.priceMin ?? produto.priceMax ?? 0) || 0;
    const priceMax = Number(produto.priceMax ?? produto.priceMin ?? 0) || 0;

    const taxaRaw = Number(produto.commissionRate ?? 0) || 0;
    const taxaDecimal = taxaRaw > 1 ? taxaRaw / 100 : taxaRaw;

    const ganhoTotalMin = priceMin * taxaDecimal;
    const ganhoTotalMax = priceMax * taxaDecimal;

    const ganhoUsuarioMin = ganhoTotalMin * 0.10;
    const ganhoUsuarioMax = ganhoTotalMax * 0.30;

    const REAIS_PARA_PONTOS = 1000;
    const pointsMin = Math.floor(ganhoUsuarioMin * REAIS_PARA_PONTOS);
    const pointsMax = Math.floor(ganhoUsuarioMax * REAIS_PARA_PONTOS);

    const pontos = Math.floor(((pointsMax)) || pointsMax || pointsMin) || 0;

    console.log("DEBUG CALCULO:", {
  priceMax,
  taxaRaw,
  taxaDecimal,
  ganhoTotalMax,
  ganhoUsuarioMax,
  pointsMax
});


    // 5) marketplace
    const { data: marketplace } = await supabaseAdmin
      .from("marketplaces")
      .select("id")
      .eq("nome", "shopee")
      .single();

    if (!marketplace) {
      return NextResponse.json({ error: "Marketplace não encontrado" }, { status: 500 });
    }

    // 6) Inserir generate_link
    const { data: insertedLink, error: insertError } = await supabaseAdmin
      .from("generate_link")
      .insert({
        id: generateLinkUUID,
        user_id: appUser.id,
        produto_nome: produto.productName,
        produto_url: originUrl,
        link_rastreado: shortLink,
        valor: priceMax,
        ganhos: Number((taxaDecimal * 100).toFixed(2)), // percentual em %
        ganho_estimado: ganhoTotalMax,
        pontos: pontos,
        produto_imagem: produto.imageUrl,
        marketplace_id: marketplace.id,
        plataforma: "Shopee",
        data_criacao: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !insertedLink) {
      console.error("ERRO AO INSERIR generate_link:", insertError);
      return NextResponse.json({ error: insertError?.message || "Erro ao salvar link" }, { status: 500 });
    }

    // 7) categorias (mesmo que falhe, não impede retorno)
    const categorias = produto.productCatIds || [];
    if (categorias.length > 0) {
      const categoriasInsert = categorias.map((catId: number, index: number) => ({
        generate_link_id: insertedLink.id,
        categoria_id: catId,
        nivel: index + 1,
        link_rastreado: shortLink,
        created_at: new Date().toISOString(),
      }));
      const { error: catError } = await supabaseAdmin.from("categoria_shopee").insert(categoriasInsert);
      if (catError) console.error("ERRO AO INSERIR categoria_shopee:", catError);
    }

    // 8) RETORNO: enviar múltiplos aliases para garantir compatibilidade com o frontend
    const responsePayload = {
      success: true,
      produto_nome: produto.productName,
      produto_imagem: produto.imageUrl,
      // valor mostrado no card
      valor: priceMax,
      // pontos (campo principal)
      pontos,
      // aliases camelCase que o componente espera
      pointsMin,
      pointsMax,
      // aliases snake_case / antigos pra segurança
      points_min: pointsMin,
      points_max: pointsMax,
      ganho_min: ganhoUsuarioMin,
      ganho_max: ganhoUsuarioMax,

      // extras
      percentual_comissao: Number((taxaDecimal * 100).toFixed(2)),
      link_rastreado: shortLink,
      produto_url: originUrl,
      plataforma: "Shopee",
      generate_link_id: insertedLink.id,
    };

    // 🔥 9) VERIFICAR CONQUISTAS
let conquistas = null;

const { data: conquistasData } = await supabaseAdmin.rpc(
  "verificar_conquistas_usuario",
  { p_auth_user_id: user.id }
);

conquistas = conquistasData;

    return NextResponse.json({
  ...responsePayload,
  ...(conquistas || {}),
});
  } catch (error) {
    console.error("Erro Shopee:", error);
    return NextResponse.json({ error: "Erro interno ao gerar link Shopee" }, { status: 500 });
  }
}
