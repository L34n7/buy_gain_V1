import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";
import { TELEGRAM_GENERATE_LINK } from "@/lib/telegram/config";

async function registrarErroLink(
  supabase: any,
  userId: string | null,
  url: string,
  erro: string,
  plataforma: string
) {
  try {
    await supabase.from("links_erro").insert({
      user_id: userId ?? null,
      url,
      erro,
      plataforma,
      data: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Erro ao registrar log:", e);
  }
}

const APP_ID = process.env.SHOPEE_APP_ID!;
const SECRET = process.env.SHOPEE_SECRET!;
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";


 /* Funções auxiliares mensagem TELEGRAM */
function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

/* =========================
   Expandir link curto
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

    if (!isShortLink) return url;

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
   Limpar parâmetros
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

    const productMatch = pathname.match(/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return {
        shopId: productMatch[1],
        itemId: productMatch[2],
      };
    }

    const shareMatch = pathname.match(/-i\.(\d+)\.(\d+)/);
    if (shareMatch) {
      return {
        shopId: shareMatch[1],
        itemId: shareMatch[2],
      };
    }

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
  let originUrl = "";
  let internalUserId: string | null = null;
  let isGuest = true;

  try {
    const supabaseUser = await createUserSupabase();
    const supabaseAdmin = await createAdminSupabase();

    const body = await req.json();
    originUrl = body.originUrl || body.originalUrl;

    if (!originUrl) {
      return NextResponse.json(
        { error: "originUrl é obrigatório" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    let bonusPercent = 0;
    let bonusSource: string | null = null;

    if (user) {
      const { data: appUser, error: appErr } = await supabaseAdmin
        .from("users")
        .select("id, level_bonus_percent, level_bonus_expires_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (appErr || !appUser) {
        return NextResponse.json(
          { error: "Usuário não encontrado na tabela users" },
          { status: 404 }
        );
      }

      internalUserId = appUser.id;
      isGuest = false;

      const agora = new Date();
      const bonusAtivo =
        !!appUser.level_bonus_expires_at &&
        new Date(appUser.level_bonus_expires_at).getTime() > agora.getTime();

      bonusPercent = bonusAtivo
        ? Number(appUser.level_bonus_percent || 0)
        : 0;

      bonusSource = bonusAtivo ? "LEVEL_UP_3_DIAS" : null;
    }

    /* =========================
       CACHE (3 horas)
    ========================= */
    const tresHorasAtras = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();

    let cacheQuery = supabaseAdmin
      .from("generate_link")
      .select("*")
      .eq("produto_url", originUrl)
      .gte("data_criacao", tresHorasAtras)
      .order("data_criacao", { ascending: false })
      .limit(1);

    if (!isGuest && internalUserId) {
      cacheQuery = cacheQuery.eq("user_id", internalUserId);
    } else {
      cacheQuery = cacheQuery.is("user_id", null);
    }

    const { data: cache } = await cacheQuery.maybeSingle();

    if (cache?.link_rastreado) {
      const pontos = Number(cache.pontos ?? 0) || 0;
      const pointsMin = Math.floor(pontos * 0.05);

      console.log("⚡ Cache Shopee encontrado - retornando sem chamar API");

      return NextResponse.json({
        success: true,
        produto_nome: cache.produto_nome,
        produto_imagem: cache.produto_imagem,
        valor: cache.valor,
        pontos,
        pointsMin,
        link_rastreado: cache.link_rastreado,
        produto_url: cache.produto_url,
        plataforma: cache.plataforma ?? "Shopee",
        generate_link_id: cache.id,
        bonus_percent: isGuest ? 0 : cache.bonus_percent,
        bonus_source: isGuest ? null : cache.bonus_source,
        cached: true,
        guest_mode: isGuest,
      });
    }

    /* =========================
       Tratamento URL
    ========================= */
    const urlExpandida = await expandirSeForLinkCurto(originUrl);
    const urlLimpa = limparParametros(urlExpandida);

    const extracted = extractProductData(urlLimpa);

    if (!extracted) {
      await registrarErroLink(
        supabaseAdmin,
        internalUserId,
        originUrl,
        "URL da Shopee inválida",
        "shopee"
      );

      return NextResponse.json(
        { error: "URL da Shopee inválida" },
        { status: 400 }
      );
    }

    const { shopId, itemId } = extracted;
    const originUrlLimpa = `https://shopee.com.br/product/${shopId}/${itemId}`;

    /* =========================
       Buscar produto
    ========================= */
    console.log("Chamando productOfferV2 Shopee...");

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
      await registrarErroLink(
        supabaseAdmin,
        internalUserId,
        originUrl,
        "Produto não encontrado na Shopee Affiliate",
        "shopee"
      );

      return NextResponse.json(
        { error: "Produto não encontrado na Shopee Affiliate" },
        { status: 404 }
      );
    }

    /* =========================
       Gerar ID
    ========================= */
    const hexId = crypto.randomBytes(16).toString("hex");
    const generateLinkUUID = hexToUUID(hexId);

    /* =========================
       Gerar Short Link
    ========================= */
    console.log("Chamando generateShortLink Shopee...");

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

      await registrarErroLink(
        supabaseAdmin,
        internalUserId,
        originUrl,
        "Erro ao gerar short link",
        "shopee"
      );

      return NextResponse.json(
        { error: "Erro ao gerar short link" },
        { status: 500 }
      );
    }

    /* =========================
       Cálculo
    ========================= */
    const priceMax = Number(produto.priceMax ?? 0) || 0;
    const taxaRaw = Number(produto.commissionRate ?? 0) || 0;
    const taxaDecimal = taxaRaw > 1 ? taxaRaw / 100 : taxaRaw;

    const ganhoTotalMax = priceMax * taxaDecimal;
    const ganhoUsuarioMax = ganhoTotalMax * 0.30;

    const REAIS_PARA_PONTOS = 100;
    const pointsMax = Math.floor(ganhoUsuarioMax * REAIS_PARA_PONTOS);
    const pointsMin = Math.floor(pointsMax * 0.8);
    const pontos = pointsMax || 0;

    /* =========================
       Marketplace
    ========================= */
    const { data: marketplace } = await supabaseAdmin
      .from("marketplaces")
      .select("id")
      .eq("nome", "shopee")
      .single();

    if (!marketplace) {
      return NextResponse.json(
        { error: "Marketplace não encontrado" },
        { status: 500 }
      );
    }

    /* =========================
       Insert
    ========================= */
    const { data: insertedLink, error: insertError } = await supabaseAdmin
      .from("generate_link")
      .insert({
        id: generateLinkUUID,
        user_id: internalUserId ?? null,
        produto_nome: produto.productName,
        produto_url: originUrl,
        link_rastreado: shortLink,
        valor: priceMax,
        ganhos: Number((taxaDecimal * 100).toFixed(2)),
        ganho_estimado: ganhoTotalMax,
        pontos,
        produto_imagem: produto.imageUrl,
        marketplace_id: marketplace.id,
        plataforma: "Shopee",
        bonus_percent: isGuest ? 0 : bonusPercent,
        bonus_source: isGuest ? null : bonusSource,
        data_criacao: new Date().toISOString(),
      })
      .select("id, user_id, produto_nome, produto_url, link_rastreado, valor, ganhos, ganho_estimado, pontos, bonus_percent, bonus_source, plataforma, data_criacao")
      .single();

    if (insertError || !insertedLink) {
      return NextResponse.json(
        { error: insertError?.message || "Erro ao salvar link" },
        { status: 500 }
      );
    }

    let nomeUsuario = "Visitante";

    if (insertedLink.user_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("name")
        .eq("id", insertedLink.user_id)
        .maybeSingle();

      if (userError) {
        console.error("Erro ao buscar nome do usuário:", userError);
      }

      nomeUsuario = userData?.name?.trim() || "Usuário sem nome";
    }

    const telegramMessage = `
    🔔 <b>Novo link gerado (Shopee)</b>

    👤 <b>Usuário:</b> ${formatText(nomeUsuario)}
    🆔 <b>User ID:</b> <code>${formatText(insertedLink.user_id)}</code>
    🏪 <b>Plataforma:</b> ${formatText(insertedLink.plataforma)}

    📦 <b>Produto:</b> ${formatText(insertedLink.produto_nome)}
    🌐 <b>URL do produto:</b>
    ${formatText(insertedLink.produto_url)}

    🔗 <b>Link rastreado:</b>
    ${formatText(insertedLink.link_rastreado)}

    💰 <b>Valor:</b> ${formatMoney(insertedLink.valor)}
    📈 <b>Ganhos (%):</b> ${formatText(insertedLink.ganhos)}
    💵 <b>Ganho estimado:</b> ${formatMoney(insertedLink.ganho_estimado)}
    🎯 <b>Pontos:</b> ${formatText(insertedLink.pontos)}

    🎁 <b>Bônus:</b> ${formatText(insertedLink.bonus_percent)}%
    📌 <b>Origem bônus:</b> ${formatText(insertedLink.bonus_source)}

    🕒 <b>Data:</b> ${new Date().toLocaleString("pt-BR")}
    `;

    const telegramResult = await sendTelegramMessage(
      telegramMessage,
      TELEGRAM_GENERATE_LINK
    );

    console.log("Resultado Telegram generate_link Shopee:", telegramResult);

    return NextResponse.json({
      success: true,
      produto_nome: produto.productName,
      produto_imagem: produto.imageUrl,
      valor: priceMax,
      pontos,
      pointsMin: pointsMin,
      link_rastreado: shortLink,
      produto_url: originUrl,
      plataforma: "Shopee",
      generate_link_id: insertedLink.id,
      bonus_percent: isGuest ? 0 : bonusPercent,
      bonus_source: isGuest ? null : bonusSource,
      guest_mode: isGuest,
    });
  } catch (error: any) {
    console.error("Erro API Shopee:", error);

    try {
      const supabaseAdmin = await createAdminSupabase();

      await supabaseAdmin.from("links_erro").insert({
        user_id: internalUserId ?? null,
        url: originUrl || "desconhecida",
        erro: error?.message || "Erro interno",
        plataforma: "shopee",
        data: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json(
      { error: "Erro interno ao gerar link Shopee" },
      { status: 500 }
    );
  }
}