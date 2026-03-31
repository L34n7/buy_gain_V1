import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

const CODIGO_INSTAGRAM = process.env.MISSAO_INSTAGRAM_CODIGO?.trim();
const PONTOS_INSTAGRAM = 150;
const MISSAO_INSTAGRAM = "seguir_instagram";
const ORIGEM_EXTRATO = "FOLLOW_INSTA";

export async function POST(req: Request) {
  try {
    if (!CODIGO_INSTAGRAM) {
      return NextResponse.json(
        { error: "Erro interno: código Instagram não configurado." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const codigo = String(body?.codigo || "").trim().toUpperCase();

    if (!codigo) {
      return NextResponse.json(
        { error: "Informe o código." },
        { status: 400 }
      );
    }

    if (codigo !== CODIGO_INSTAGRAM.toUpperCase()) {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const admin = createAdminSupabase();

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      console.error("Erro ao buscar usuário legado:", legacyError);
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { data: jaConcluiu, error: checkErr } = await admin
      .from("instagram_codigos")
      .select("id, criado_em")
      .eq("user_id", legacyUser.id)
      .eq("missao", MISSAO_INSTAGRAM)
      .maybeSingle();

    if (checkErr) {
      console.error("Erro ao verificar missão Instagram:", checkErr);
      return NextResponse.json(
        { error: "Erro ao verificar missão." },
        { status: 500 }
      );
    }

    if (jaConcluiu) {
      return NextResponse.json(
        {
          error: "Essa missão já foi concluída.",
          concluida: true,
          data_conclusao: jaConcluiu.criado_em,
        },
        { status: 400 }
      );
    }

    const { data: registroMissao, error: insertMissaoErr } = await admin
      .from("instagram_codigos")
      .insert({
        user_id: legacyUser.id,
        codigo: CODIGO_INSTAGRAM,
        missao: MISSAO_INSTAGRAM,
      })
      .select("id, criado_em")
      .single();

    if (insertMissaoErr || !registroMissao) {
      console.error("Erro ao salvar missão Instagram:", insertMissaoErr);
      return NextResponse.json(
        { error: "Erro ao concluir missão." },
        { status: 500 }
      );
    }

    try {
      const { data: extrato, error: extratoReadError } = await admin
        .from("extrato_pontos")
        .select("tipo, pontos")
        .eq("user_id", legacyUser.id);

      if (extratoReadError) {
        console.error("Erro ao consultar extrato:", extratoReadError);

        await admin
          .from("instagram_codigos")
          .delete()
          .eq("id", registroMissao.id);

        return NextResponse.json(
          { error: "Erro ao consultar saldo do usuário." },
          { status: 500 }
        );
      }

      const saldoAtual = !extrato
        ? 0
        : extrato.reduce((acc, row) => {
            return row.tipo === "CREDITO"
              ? acc + row.pontos
              : acc - row.pontos;
          }, 0);

      const novoSaldo = saldoAtual + PONTOS_INSTAGRAM;

      const { error: extratoInsertError } = await admin
        .from("extrato_pontos")
        .insert({
          user_id: legacyUser.id,
          tipo: "CREDITO",
          origem: ORIGEM_EXTRATO,
          referencia_id: registroMissao.id,
          pontos: PONTOS_INSTAGRAM,
          saldo_apos: novoSaldo,
        });

      if (extratoInsertError) {
        console.error("Erro ao inserir extrato de pontos:", extratoInsertError);

        await admin
          .from("instagram_codigos")
          .delete()
          .eq("id", registroMissao.id);

        return NextResponse.json(
          { error: "Erro ao registrar os pontos da missão." },
          { status: 500 }
        );
      }

      const { error: conquistasError } = await admin.rpc(
        "verificar_conquistas_usuario",
        {
          p_auth_user_id: user.id,
        }
      );

      if (conquistasError) {
        console.error(
          "Erro ao verificar conquistas do usuário:",
          conquistasError
        );
      }

      return NextResponse.json({
        success: true,
        missao_id: MISSAO_INSTAGRAM,
        pontos_ganhos: PONTOS_INSTAGRAM,
        saldo_apos: novoSaldo,
        data_conclusao: registroMissao.criado_em,
        message: "Missão concluída com sucesso.",
      });
    } catch (e) {
      console.error("Erro ao aplicar bônus da missão Instagram:", e);

      await admin
        .from("instagram_codigos")
        .delete()
        .eq("id", registroMissao.id);

      return NextResponse.json(
        { error: "Erro ao aplicar os pontos da missão." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro interno POST /api/missoes/instagram:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}