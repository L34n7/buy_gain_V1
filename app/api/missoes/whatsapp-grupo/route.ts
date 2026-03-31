import { NextRequest, NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

const CODIGO_WHATSAPP = process.env.MISSAO_WHATSAPP_CODIGO?.trim();
const PONTOS_RECOMPENSA = 200;

export async function POST(req: NextRequest) {
  try {
    if (!CODIGO_WHATSAPP) {
      return NextResponse.json(
        { error: "Erro interno: código da missão não configurado." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const codigo = String(body?.codigo || "").trim().toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        { error: "Código não informado." },
        { status: 400 }
      );
    }

    if (codigo !== CODIGO_WHATSAPP.toUpperCase()) {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    // 1) Usuário autenticado
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const admin = await createAdminSupabase();

    // 2) Buscar usuário interno na tabela users
    const { data: userRow, error: userRowError } = await admin
      .from("users")
      .select("id, auth_user_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userRowError || !userRow) {
      return NextResponse.json(
        { error: "Usuário não encontrado na tabela users." },
        { status: 404 }
      );
    }

    // 3) Verificar se já concluiu
    const { data: jaConcluiu, error: checkError } = await admin
      .from("whatsapp_grupo_codigos")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { error: "Erro ao verificar missão já concluída." },
        { status: 500 }
      );
    }

    if (jaConcluiu) {
      return NextResponse.json(
        { error: "Você já concluiu essa missão." },
        { status: 400 }
      );
    }

    // 4) Salvar missão concluída e obter o ID
    const { data: missaoInserida, error: insertCodigoError } = await admin
      .from("whatsapp_grupo_codigos")
      .insert({
        auth_user_id: user.id,
        codigo,
      })
      .select("id, criado_em")
      .single();

    if (insertCodigoError || !missaoInserida) {
      return NextResponse.json(
        {
          error: `Erro ao salvar conclusão da missão: ${insertCodigoError?.message || "Falha ao obter ID da missão."}`,
        },
        { status: 500 }
      );
    }

    // 5) Buscar último saldo do extrato
    const { data: ultimoExtrato, error: extratoError } = await admin
      .from("extrato_pontos")
      .select("saldo_apos")
      .eq("user_id", userRow.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (extratoError) {
      return NextResponse.json(
        {
          error: `Erro ao buscar saldo atual: ${extratoError.message}`,
        },
        { status: 500 }
      );
    }

    const saldoAnterior = Number(ultimoExtrato?.saldo_apos || 0);
    const saldoAtual = saldoAnterior + PONTOS_RECOMPENSA;

    // 6) Inserir pontos usando o ID da missão como referência
    const { error: insertPontosError } = await admin
      .from("extrato_pontos")
      .insert({
        user_id: userRow.id,
        tipo: "CREDITO",
        origem: "GRUPO_WHATSAPP",
        referencia_id: missaoInserida.id,
        pontos: PONTOS_RECOMPENSA,
        saldo_apos: saldoAtual,
      });

    if (insertPontosError) {
      return NextResponse.json(
        {
          error: `Erro ao inserir pontos: ${insertPontosError.message}`,
        },
        { status: 500 }
      );
    }

    // 7) Chamar verificação de conquistas
    const { error: conquistaError } = await admin.rpc(
      "verificar_conquistas_usuario",
      { p_auth_user_id: user.id }
    );

    if (conquistaError) {
      return NextResponse.json(
        {
          error: `Missão salva, pontos inseridos, mas houve erro ao verificar conquistas: ${conquistaError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Missão concluída com sucesso.",
      pontos_ganhos: PONTOS_RECOMPENSA,
      saldo_atual: saldoAtual,
      data_conclusao: missaoInserida.criado_em,
    });
  } catch (error) {
    console.error("Erro na missão WhatsApp grupo:", error);

    return NextResponse.json(
      { error: "Erro interno ao concluir missão." },
      { status: 500 }
    );
  }
}