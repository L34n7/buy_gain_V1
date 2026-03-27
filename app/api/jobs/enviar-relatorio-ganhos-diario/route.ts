import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";
import { TELEGRAM_RELATORIO } from "@/lib/telegram/config";

const ML_STATUS_VALIDOS = [
  "CRIADO",
  "AGUARDANDO_CONFIRMACAO",
  "CONFIRMADO_PELO_USUARIO",
  "SOLICITAR_PROVA",
  "EM_ANALISE",
  "AGUARDANDO_RESPOSTA_CANCELADO",
  "ANALISE_MANUAL",
  "CONFIRMADO_FINAL",
];

const SHOPEE_STATUS_VALIDOS = ["PENDING", "COMPLETED"];

type EventoBase = {
  produto_vendas: number | string | null;
  produto_ganho_estimado: number | string | null;
  ganho_pontos: number | string | null;
  status: string | null;
};

type Resumo = {
  totalProdutos: number;
  lucroTotal: number;
  totalUsuario: number;
  totalFinal: number;
};

type ResumoStatus = {
  quantidade: number;
  valor: number;
};

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatInt(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

function calcularResumo(eventos: EventoBase[]): Resumo {
  const totalProdutos = eventos.reduce(
    (acc, item) => acc + toNumber(item.produto_vendas),
    0
  );

  const lucroTotal = eventos.reduce(
    (acc, item) => acc + toNumber(item.produto_ganho_estimado),
    0
  );

  const totalUsuario = eventos.reduce(
    (acc, item) => acc + toNumber(item.ganho_pontos),
    0
  );

  const totalFinal = lucroTotal - totalUsuario;

  return {
    totalProdutos,
    lucroTotal,
    totalUsuario,
    totalFinal,
  };
}

function calcularResumoPorStatus(eventos: EventoBase[]) {
  const mapa: Record<string, ResumoStatus> = {};

  for (const item of eventos) {
    const status = String(item.status || "").trim();
    if (!status) continue;

    if (!mapa[status]) {
      mapa[status] = {
        quantidade: 0,
        valor: 0,
      };
    }

    mapa[status].quantidade += 1;
    mapa[status].valor += toNumber(item.produto_ganho_estimado);
  }

  return mapa;
}

function montarBlocoStatus(
  titulo: string,
  resumoStatus: Record<string, ResumoStatus>
) {
  const linhas: string[] = [];

  for (const [status, info] of Object.entries(resumoStatus)) {
    if (info.quantidade <= 0) continue;

    linhas.push(
      `┣ ${status}: <b>${formatInt(info.quantidade)}</b> — ${formatMoney(info.valor)}`
    );
  }

  if (linhas.length === 0) return "";

  return `

${titulo}
${linhas.join("\n")}
`;
}

function calcularMargem(lucro: number, custo: number) {
  if (!lucro || lucro === 0) return 0;

  const margem = (lucro - custo) / lucro;
  return margem;
}

function formatPercent(value: number) {
  return (value * 100).toFixed(2) + "%";
}

export async function GET() {
  try {
    const supabase = await createAdminSupabase();

    /* ------------------------------
       MERCADO LIVRE
    ------------------------------ */
    const { data: mlEventos, error: mlError } = await supabase
      .from("ml_eventos")
      .select("produto_vendas, produto_ganho_estimado, ganho_pontos, status")
      .in("status", ML_STATUS_VALIDOS);

    if (mlError) {
      console.error("Erro ao buscar ml_eventos:", mlError);
      return NextResponse.json(
        { error: "Erro ao buscar ml_eventos" },
        { status: 500 }
      );
    }

    const mlLista = (mlEventos ?? []) as EventoBase[];
    const mlResumo = calcularResumo(mlLista);
    const mlStatusResumo = calcularResumoPorStatus(mlLista);

    /* ------------------------------
       SHOPEE
    ------------------------------ */
    const { data: shopeeEventos, error: shopeeError } = await supabase
      .from("shopee_eventos")
      .select("produto_vendas, produto_ganho_estimado, ganho_pontos, status")
      .in("status", SHOPEE_STATUS_VALIDOS);

    if (shopeeError) {
      console.error("Erro ao buscar shopee_eventos:", shopeeError);
      return NextResponse.json(
        { error: "Erro ao buscar shopee_eventos" },
        { status: 500 }
      );
    }

    const shopeeLista = (shopeeEventos ?? []) as EventoBase[];
    const shopeeResumo = calcularResumo(shopeeLista);
    const shopeeStatusResumo = calcularResumoPorStatus(shopeeLista);

    /* ------------------------------
       TOTAL GERAL
    ------------------------------ */
    const totalGeral: Resumo = {
      totalProdutos: mlResumo.totalProdutos + shopeeResumo.totalProdutos,
      lucroTotal: mlResumo.lucroTotal + shopeeResumo.lucroTotal,
      totalUsuario: mlResumo.totalUsuario + shopeeResumo.totalUsuario,
      totalFinal: 0,
    };

    totalGeral.totalFinal = totalGeral.lucroTotal - totalGeral.totalUsuario;

    const margemGeral = calcularMargem(
    totalGeral.lucroTotal,
    totalGeral.totalUsuario
    );

    const margemML = calcularMargem(
    mlResumo.lucroTotal,
    mlResumo.totalUsuario
    );

    const margemShopee = calcularMargem(
    shopeeResumo.lucroTotal,
    shopeeResumo.totalUsuario
    );

    const blocoStatusML = montarBlocoStatus(
      "📌 <b>Status Mercado Livre</b>",
      mlStatusResumo
    );

    const blocoStatusShopee = montarBlocoStatus(
      "📌 <b>Status Shopee</b>",
      shopeeStatusResumo
    );

    const mensagem = `
    📊 <b>RELATÓRIO DE GANHOS</b>
    ━━━━━━━━━━━━━━━━━━

    🛒 <b>Mercado Livre</b>
    ┣ 📦 Produtos: <b>${formatMoney(mlResumo.totalProdutos)}</b>
    ┣ 💰 Lucro: <b>${formatMoney(mlResumo.lucroTotal)}</b>
    ┣ 🎯 Usuário: <b>${formatMoney(mlResumo.totalUsuario)}</b>
    ┣ 📊 Margem: <b>${formatPercent(margemML)}</b>
    ┗ 🧾 Resultado: <b>${formatMoney(mlResumo.totalFinal)}</b>
    ${blocoStatusML}

    🧡 <b>Shopee</b>
    ┣ 📦 Produtos: <b>${formatMoney(shopeeResumo.totalProdutos)}</b>
    ┣ 💰 Lucro: <b>${formatMoney(shopeeResumo.lucroTotal)}</b>
    ┣ 🎯 Usuário: <b>${formatMoney(shopeeResumo.totalUsuario)}</b>
    ┣ 📊 Margem: <b>${formatPercent(margemShopee)}</b>
    ┗ 🧾 Resultado: <b>${formatMoney(shopeeResumo.totalFinal)}</b>
    ${blocoStatusShopee}

    ━━━━━━━━━━━━━━━━━━
    💰 <b>RESULTADO GERAL</b>

    ┣ 📦 Produtos: <b>${formatMoney(totalGeral.totalProdutos)}</b>
    ┣ 💰 Lucro total: <b>${formatMoney(totalGeral.lucroTotal)}</b>
    ┣ 🎯 Usuário total: <b>${formatMoney(totalGeral.totalUsuario)}</b>
    ┗ 🧾 <b>Total final: ${formatMoney(totalGeral.totalFinal)}</b>

      💹 Margem: <b>${formatPercent(margemGeral)}</b>

    ━━━━━━━━━━━━━━━━━━
    🕒 <i>${new Date().toLocaleString("pt-BR")}</i>
    `;

    
    const telegramResult = await sendTelegramMessage(
      mensagem,
      TELEGRAM_RELATORIO
    );

    console.log("Resultado Telegram relatório:", telegramResult);

    return NextResponse.json({
      ok: true,
      mlResumo,
      shopeeResumo,
      totalGeral,
      mlStatusResumo,
      shopeeStatusResumo,
      telegramResult,
    });
  } catch (error: any) {
    console.error("Erro no job enviar-relatorio-ganhos-diario:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}