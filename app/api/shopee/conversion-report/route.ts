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

// 🔥 Converter HEX para UUID
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
      `
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

    const nodes = result?.data?.conversionReport?.nodes || [];

    console.log("NODES RECEBIDOS:", JSON.stringify(nodes, null, 2));

    
    for (const node of nodes) {
      console.log("UTM RECEBIDO:", node.utmContent);

      //if (!node.utmContent) continue;

      const cleanHex = node.utmContent.replace(/-+$/, "");
     // if (cleanHex.length !== 32) continue;

      const formattedUUID = hexToUUID(cleanHex);

      const { data: generateLink } = await supabase
        .from("generate_link")
        .select("id, user_id, produto_imagem")
        .eq("id", formattedUUID)
        .maybeSingle();

      if (!generateLink) continue;

      for (const order of node.orders) {
        for (const item of order.items) {

          // 🔁 Verifica duplicidade pelo pedido
          const { data: existing } = await supabase
            .from("shopee_eventos")
            .select("id")
            .eq("observacao", order.orderId)
            .maybeSingle();

          if (existing) continue;

          const comissao = Number(item.itemTotalCommission || 0);
          const pontos = Math.floor(comissao * 1000);
          const valorProduto = Number(item.actualAmount || 0);
          
        await supabase.from("shopee_eventos").insert({
          user_id: generateLink.user_id,
          generate_link_id: generateLink.id, // ✅ correto

          status: order.orderStatus,
          origem: "shopee",

          pedido_id: order.orderId, // ✅ correto

          data_evento: new Date(node.purchaseTime * 1000),
          data_update: item.completeTime
            ? new Date(item.completeTime * 1000)
            : new Date(),

          variacao_id: item.itemId,
          resposta: item.fraudStatus || null,

          produto_vendas: valorProduto,
          produto_ganhos: comissao,
          produto_ganho_estimado: comissao,
          ganho_pontos: pontos,

          produto_nome: item.itemName,
          produto_imagem: generateLink.produto_imagem || null,

          pontos_liberados: false
        });
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
