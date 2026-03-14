import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

import { sendResgateEmail } from "@/lib/email/sendResgateEmail";

export async function POST(req: Request) {
  try {
    const { giftcard_opcao_id } = await req.json();

    if (!giftcard_opcao_id) {
      return NextResponse.json(
        { error: "Opção inválida" },
        { status: 400 }
      );
    }

    // 1️⃣ Supabase usuário
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Mapear auth → public.users
    const { data: legacyUser } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!legacyUser) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    // 4️⃣ Buscar opção do giftcard (JÁ EM PONTOS REAIS)
    const { data: opcao } = await admin
      .from("giftcard_opcoes")
      .select("id, giftcard_id, pontos, descricao")
      .eq("id", giftcard_opcao_id)
      .single();

        if (!opcao) {
          return NextResponse.json(
            { error: "Opção não encontrada" },
            { status: 404 }
          );
        }

        
    const { data: giftcard } = await admin
      .from("giftcards")
      .select("id, nome, descricao")
      .eq("id", opcao.giftcard_id)
      .single();



    // 5️⃣ Saldo atual (EM PONTOS REAIS)
    const { data: ultimoExtrato } = await admin
      .from("extrato_pontos")
      .select("saldo_apos")
      .eq("user_id", user_id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();

    const saldoAtual = Number(ultimoExtrato?.saldo_apos ?? 0);

    if (saldoAtual < opcao.pontos) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    // 6️⃣ Criar resgate
    const { data: resgate, error: insertError } = await admin
      .from("recompensa_resgates")
      .insert({
        user_id,
        giftcard_id: opcao.giftcard_id,
        giftcard_opcao_id: opcao.id,
        pontos_usados: opcao.pontos, // 🔥 pontos reais
        status: "PENDENTE",
      })
      .select()
      .single();

    if (insertError || !resgate) {
      console.error("Erro ao inserir resgate:", insertError);
      return NextResponse.json(
        { error: "Erro ao criar resgate" },
        { status: 500 }
      );
    }

    // 7️⃣ Débito no extrato (🔥 SEM CONVERSÃO)
    const novoSaldo = saldoAtual - opcao.pontos;

    const { error: erroDebito } = await admin
      .from("extrato_pontos")
      .insert({
        user_id,
        tipo: "DEBITO",
        origem: "RESGATE_RECOMPENSA",
        referencia_id: String(resgate.id),
        pontos: opcao.pontos,       // 🔥 320000
        saldo_apos: novoSaldo,      // 🔥 pontos reais
      });

    if (erroDebito) {
      console.error("Erro ao inserir débito no extrato:", erroDebito);

      await admin
        .from("recompensa_resgates")
        .update({ status: "ERRO" })
        .eq("id", resgate.id);

      return NextResponse.json(
        { error: "Erro ao debitar pontos" },
        { status: 500 }
      );
    }

    // 8️⃣ Histórico (espelho)
    await admin.from("recompensas_historico").insert({
      usuario_id: user_id,
      giftcard_id: opcao.giftcard_id,
      giftcard_opcao_id: opcao.id,
      pontos_gastos: opcao.pontos, // pontos reais
      status: "PENDENTE",
    });

    const conquistasData = await triggerConquistas(admin, user.id);

    // 🔥 Se existir array de conquistas, vamos extrair XP e level
    let xpTotal = 0;
    let leveledUp = false;
    let newLevel: number | null = null;

    if (Array.isArray(conquistasData?.conquistas)) {
      conquistasData.conquistas.forEach((c: any) => {
        if (c.xp_ganho) {
          xpTotal += c.xp_ganho;
        }

        if (c.subiu_level) {
          leveledUp = true;
          newLevel = c.novo_level;
        }
      });
    }


    try {
      const { data: userData } = await admin
        .from("users")
        .select("name, email")
        .eq("id", user_id)
        .single();

      const emailDestino = userData?.email || user.email;
      const prazoEntrega = "Em até 2 dias úteis";

      if (emailDestino) {
        await sendResgateEmail({
          to: emailDestino,
          userName: userData?.name || "Cliente",
          resgateId: String(resgate.id),
          giftcardNome: giftcard?.nome || "Gift Card",
          opcaoLabel: opcao?.descricao || "Opção selecionada",
          pontosUsados: Number(opcao?.pontos || 0),
          saldoRestante: Number(novoSaldo || 0),
          prazoEntrega,
        });

        await admin
          .from("recompensa_resgates")
          .update({
            email_resgate_enviado: true,
            email_resgate_enviado_em: new Date().toISOString(),
            email_resgate_erro: null,
          })
          .eq("id", resgate.id);
      }
    } catch (emailError: any) {
      console.error("Erro ao enviar email de resgate:", emailError);

      await admin
        .from("recompensa_resgates")
        .update({
          email_resgate_enviado: false,
          email_resgate_erro: emailError?.message || "Erro desconhecido ao enviar email",
        })
        .eq("id", resgate.id);
    }



    return NextResponse.json({
      success: true,
      resgate_id: resgate.id,

      // 🔥 padrão global
      xp_gained: xpTotal || undefined,
      leveled_up: leveledUp || undefined,
      new_level: newLevel || undefined,

      // mantém conquistas também
      ...(conquistasData || {}),
    });

  } catch (err) {
    console.error("Erro resgatar recompensa:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
