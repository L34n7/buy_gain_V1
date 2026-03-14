import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabase } from "@/lib/supabaseServer";

const APP_ID = process.env.SHOPEE_APP_ID!;
const SECRET = process.env.SHOPEE_SECRET!;
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

function generateSignature(payload: string, timestamp: string) {
  const factor = APP_ID + timestamp + payload + SECRET;

  return crypto
    .createHash("sha256")
    .update(factor, "utf8")
    .digest("hex");
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

export async function GET() {
  try {
    const supabase = await createAdminSupabase();

    const purchaseTimeStart = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
    );

    const purchaseTimeEnd = Math.floor(Date.now() / 1000);

    const queryData = {
      query: `
        query {
          conversionReport(
            purchaseTimeStart: ${purchaseTimeStart},
            purchaseTimeEnd: ${purchaseTimeEnd},
            limit: 100
          ) {
            nodes {
              utmContent
              purchaseTime
              orders {
                orderId
                orderStatus
                items {
                  itemId
                  itemName
                  completeTime
                  itemTotalCommission
                  actualAmount
                  fraudStatus
                }
              }
            }
          }
        }
      `,
    };

    const payload = JSON.stringify(queryData);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(payload, timestamp);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
    });

    const result = await response.json();

    console.log("CONVERSION RESPONSE:", result);

    if (result?.errors?.length) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors[0]?.message || "Erro retornado pela Shopee",
          details: result.errors,
        },
        { status: 400 }
      );
    }

    const nodes = result?.data?.conversionReport?.nodes || [];

    console.log("NODES RECEBIDOS:", JSON.stringify(nodes, null, 2));

    for (const node of nodes) {
      console.log("UTM RECEBIDO:", node.utmContent);

      if (!node.utmContent) continue;

      const cleanHex = node.utmContent.replace(/-+$/, "");
      if (cleanHex.length !== 32) continue;

      const formattedUUID = hexToUUID(cleanHex);

      const { data: generateLink } = await supabase
        .from("generate_link")
        .select("id, user_id, produto_imagem")
        .eq("id", formattedUUID)
        .maybeSingle();

      if (!generateLink) continue;

      for (const order of node.orders || []) {
        for (const item of order.items || []) {
          const comissao = Number(item.itemTotalCommission || 0);
          const ganhoReais = Number((comissao * 0.3).toFixed(2));
          const valorProduto = Number(item.actualAmount || 0);

          const statusShopee = String(order.orderStatus || "").toUpperCase();
          const pedidoConcluidoNaShopee = statusShopee === "COMPLETED";
          const liberarAgora = pedidoConcluidoNaShopee && comissao < 30;

          let statusFinal = "PENDING";

          if (statusShopee === "CANCELLED") {
            statusFinal = "CANCELLED";
          } else if (statusShopee === "COMPLETED") {
            statusFinal = "COMPLETED";
          } else {
            statusFinal = "PENDING";
          }

          const { data: existing } = await supabase
            .from("shopee_eventos")
            .select("id, pontos_liberados")
            .eq("pedido_id", order.orderId)
            .eq("generate_link_id", generateLink.id)
            .maybeSingle();

          let eventoId: string | null = null;

          if (existing) {
            const { data: updatedEvento, error: updateError } = await supabase
              .from("shopee_eventos")
              .update({
                status: statusFinal,
                origem: "shopee",
                data_evento: new Date(node.purchaseTime * 1000).toISOString(),
                data_update: item.completeTime
                  ? new Date(item.completeTime * 1000).toISOString()
                  : new Date().toISOString(),
                variacao_id: item.itemId,
                resposta: item.fraudStatus || null,
                produto_vendas: valorProduto,
                produto_ganhos: comissao,
                produto_ganho_estimado: comissao,
                ganho_pontos: ganhoReais,
                produto_nome: item.itemName,
                produto_imagem: generateLink.produto_imagem || null,
                pontos_liberados: liberarAgora ? true : existing.pontos_liberados,
              })
              .eq("id", existing.id)
              .select("id")
              .single();

            if (updateError) {
              console.error("Erro ao atualizar shopee_eventos:", updateError);
              continue;
            }

            eventoId = updatedEvento.id;
          } else {
            const { data: insertedEvento, error: insertError } = await supabase
              .from("shopee_eventos")
              .insert({
                user_id: generateLink.user_id,
                generate_link_id: generateLink.id,
                status: statusFinal,
                origem: "shopee",
                pedido_id: order.orderId,
                data_evento: new Date(node.purchaseTime * 1000).toISOString(),
                data_update: item.completeTime
                  ? new Date(item.completeTime * 1000).toISOString()
                  : new Date().toISOString(),
                variacao_id: item.itemId,
                resposta: item.fraudStatus || null,
                produto_vendas: valorProduto,
                produto_ganhos: comissao,
                produto_ganho_estimado: comissao,
                ganho_pontos: ganhoReais,
                produto_nome: item.itemName,
                produto_imagem: generateLink.produto_imagem || null,
                pontos_liberados: liberarAgora,
              })
              .select("id")
              .single();

            if (insertError) {
              console.error("Erro ao inserir shopee_eventos:", insertError);
              continue;
            }

            eventoId = insertedEvento.id;
          }

          if (liberarAgora && eventoId) {

            console.log("🔎 Tentando creditar pontos Shopee");
            console.log({
              eventoId,
              orderId: order.orderId,
              statusShopee: order.orderStatus,
              comissao,
              ganhoReais,
              liberarAgora
            });

            const { data: rpcData, error: rpcError } = await supabase.rpc(
              "creditar_pontos_shopee_evento",
              { p_evento_id: eventoId }
            );

            console.log("RPC retorno:", rpcData);

            if (rpcError) {
              console.error("❌ Erro ao creditar pontos Shopee:", rpcError);
            } else {
              console.log("✅ RPC executada com sucesso para evento:", eventoId);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalConversions: nodes.length,
    });
  } catch (error) {
    console.error("Erro conversionReport:", error);

    return NextResponse.json(
      { error: "Erro ao buscar conversion report" },
      { status: 500 }
    );
  }
}