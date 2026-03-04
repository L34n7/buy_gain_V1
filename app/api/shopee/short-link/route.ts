import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";

const APP_ID = process.env.SHOPEE_APP_ID!;
const SECRET = process.env.SHOPEE_SECRET!;
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

/* =========================
   🔥 NOVO: Expandir link curto
========================= */
async function expandirSeForLinkCurto(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    const isShortLink =
      host.includes("shopee.com") ||
      host.includes("shopee.com.br") ||
      host.includes("s.shopee") ||
      host.includes("br.shopee") ||
      host.includes("shp.ee") ||
      host.includes("br.shp.ee") ||
      host.includes("shope.ee");

    if (!isShortLink) {
      return url;
    }

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    });

    return response.url;

  } catch (err) {
    console.error("Erro ao expandir link curto:", err);
    return url;
  }
}

/* =========================
   🔥 NOVO: Limpar parâmetros
========================= */
function limparParametros(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractProductData(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Formato 1: /product/shopId/itemId
    const productMatch = pathname.match(/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return {
        shopId: productMatch[1],
        itemId: productMatch[2],
      };
    }

    // Formato 2: -i.shopId.itemId
    const shareMatch = pathname.match(/-i\.(\d+)\.(\d+)/);
    if (shareMatch) {
      return {
        shopId: shareMatch[1],
        itemId: shareMatch[2],
      };
    }

    // 🔥 Formato 3: /shopId/itemId direto
    const simpleMatch = pathname.match(/\/(\d+)\/(\d+)/);
    if (simpleMatch) {
      return {
        shopId: simpleMatch[1],
        itemId: simpleMatch[2],
      };
    }

    return null;
  } catch {
    return null;
  }
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

const body = await req.json();


const originUrl = body.originUrl || body.originalUrl;

if (!originUrl) {
  return NextResponse.json(
    { error: "originUrl é obrigatório" },
    { status: 400 }
  );
}
    /* =========================
       🔥 TRATAMENTO DO LINK
    ========================= */

    const urlExpandida = await expandirSeForLinkCurto(originUrl);
    const urlLimpa = limparParametros(urlExpandida);

    const extracted = extractProductData(urlLimpa);

    if (!extracted) {
      return NextResponse.json(
        { error: "URL da Shopee inválida" },
        { status: 400 }
      );
    }

    const { shopId, itemId } = extracted;

    const originUrlLimpa = `https://shopee.com.br/product/${shopId}/${itemId}`;

    /* =========================
       1) Buscar produto
    ========================= */

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

    /* =========================
       2) Gerar IDs
    ========================= */

    const hexId = crypto.randomBytes(16).toString("hex");
    const generateLinkUUID = hexToUUID(hexId);

    /* =========================
       3) Gerar short link
    ========================= */

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

    /* =========================
       4) Cálculo
    ========================= */

    const priceMax = Number(produto.priceMax ?? 0) || 0;
    const taxaRaw = Number(produto.commissionRate ?? 0) || 0;
    const taxaDecimal = taxaRaw > 1 ? taxaRaw / 100 : taxaRaw;

    const ganhoTotalMax = priceMax * taxaDecimal;
    const ganhoUsuarioMax = ganhoTotalMax * 0.30;

    const REAIS_PARA_PONTOS = 1000;
    const pointsMax = Math.floor(ganhoUsuarioMax * REAIS_PARA_PONTOS);
    const pontos = pointsMax || 0;

    /* =========================
       5) Marketplace
    ========================= */

    const { data: marketplace } = await supabaseAdmin
      .from("marketplaces")
      .select("id")
      .eq("nome", "shopee")
      .single();

    if (!marketplace) {
      return NextResponse.json({ error: "Marketplace não encontrado" }, { status: 500 });
    }

    /* =========================
       6) Insert
    ========================= */

    const { data: insertedLink, error: insertError } = await supabaseAdmin
      .from("generate_link")
      .insert({
        id: generateLinkUUID,
        user_id: appUser.id,
        produto_nome: produto.productName,
        produto_url: originUrl, // 🔥 mantido como você pediu
        link_rastreado: shortLink,
        valor: priceMax,
        ganhos: Number((taxaDecimal * 100).toFixed(2)),
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
      return NextResponse.json({ error: insertError?.message || "Erro ao salvar link" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      produto_nome: produto.productName,
      produto_imagem: produto.imageUrl,
      valor: priceMax,
      pontos,
      link_rastreado: shortLink,
      produto_url: originUrl,
      plataforma: "Shopee",
      generate_link_id: insertedLink.id,
    });

  } catch (error) {
    console.error("Erro API Shopee:", error);
    return NextResponse.json({ error: "Erro interno ao gerar link Shopee" }, { status: 500 });
  }
}