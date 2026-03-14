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

    const validationId = 123456; // depois ideal é buscar isso do banco

    const queryData = {
      query: `
        query {
          validatedReport(validationId: ${validationId}, limit: 100) {
            nodes {
              utmContent
              orders {
                orderId
                orderStatus
                items {
                  itemId
                  itemName
                  imageUrl
                  itemTotalCommission
                  displayItemStatus
                  completeTime
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

    console.log("VALIDATED RESPONSE:", JSON.stringify(result, null, 2));

    const nodes = result?.data?.validatedReport?.nodes || [];
    console.log("TOTAL VALIDATED NODES:", nodes.length);

    for (const node of nodes) {
      if (!node.utmContent) continue;

      const cleanHex = node.utmContent.replace(/-+$/, "");
      if (cleanHex.length !== 32) continue;

      const formattedUUID = hexToUUID(cleanHex);

      for (const order of node.orders) {
        for (const item of order.items) {
          const comissaoFinal = Number(item.itemTotalCommission || 0);
          const pontos = Math.floor(comissaoFinal * 1000);

          // 1) Atualiza o evento correto da Shopee
          await supabase
            .from("shopee_eventos")
            .update({
              status: order.orderStatus || "CONCLUIDO",
              produto_ganhos: comissaoFinal,
              produto_ganho_estimado: comissaoFinal,
              ganho_pontos: pontos,
              resposta: item.displayItemStatus || null,
              data_update: item.completeTime
                ? new Date(item.completeTime * 1000).toISOString()
                : new Date().toISOString(),
            })
            .eq("generate_link_id", formattedUUID)
            .eq("pedido_id", order.orderId);

          // 2) Busca o evento atualizado
          const { data: evento } = await supabase
            .from("shopee_eventos")
            .select("id, user_id, ganho_pontos, pontos_liberados")
            .eq("generate_link_id", formattedUUID)
            .eq("pedido_id", order.orderId)
            .maybeSingle();

          if (!evento) continue;

          // 3) Verifica se já existe extrato para esse evento
          const { data: extratoExistente } = await supabase
            .from("extrato_pontos")
            .select("id")
            .eq("referencia_id", evento.id)
            .maybeSingle();

          if (extratoExistente) continue;

          // 4) Busca último saldo do usuário
          const { data: ultimoRegistro } = await supabase
            .from("extrato_pontos")
            .select("saldo_apos")
            .eq("user_id", evento.user_id)
            .order("criado_em", { ascending: false })
            .limit(1)
            .maybeSingle();

          const saldoAtual = Number(ultimoRegistro?.saldo_apos || 0);
          const pontosEvento = Number(evento.ganho_pontos || 0);
          const novoSaldo = saldoAtual + pontosEvento;

          // 5) Insere crédito no extrato
          await supabase.from("extrato_pontos").insert({
            user_id: evento.user_id,
            tipo: "CREDITO",
            origem: "shopee",
            referencia_id: evento.id,
            pontos: pontosEvento,
            saldo_apos: novoSaldo,
            criado_em: new Date().toISOString(),
          });

          // 6) Marca pontos como liberados
          await supabase
            .from("shopee_eventos")
            .update({
              pontos_liberados: true,
            })
            .eq("id", evento.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalValidated: nodes.length,
    });
  } catch (error) {
    console.error("Erro validatedReport:", error);

    return NextResponse.json(
      { error: "Erro ao buscar validated report" },
      { status: 500 }
    );
  }
}