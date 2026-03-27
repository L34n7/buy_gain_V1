import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";
import { sendResgateEmail } from "@/lib/email/sendResgateEmail";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";
import { TELEGRAM_RESGATES } from "@/lib/telegram/config";

function formatInt(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return Math.round(Number(value)).toLocaleString("pt-BR");
}

function formatText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

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

    // 4️⃣ Buscar opção do giftcard
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

    // 5️⃣ Saldo atual
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
        pontos_usados: opcao.pontos,
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

    // 7️⃣ Débito no extrato
    const novoSaldo = saldoAtual - opcao.pontos;

    const { error: erroDebito } = await admin
      .from("extrato_pontos")
      .insert({
        user_id,
        tipo: "DEBITO",
        origem: "RESGATE_RECOMPENSA",
        referencia_id: String(resgate.id),
        pontos: opcao.pontos,
        saldo_apos: novoSaldo,
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

    // 8️⃣ Histórico
    await admin.from("recompensas_historico").insert({
      usuario_id: user_id,
      giftcard_id: opcao.giftcard_id,
      giftcard_opcao_id: opcao.id,
      pontos_gastos: opcao.pontos,
      status: "PENDENTE",
    });

    const conquistasData = await triggerConquistas(admin, user.id);

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

    let userData: { name?: string | null; email?: string | null } | null = null;
    let emailDestino = user.email || null;
    const prazoEntrega = "Em até 2 dias úteis";

    try {
      const { data } = await admin
        .from("users")
        .select("name, email")
        .eq("id", user_id)
        .single();

      userData = data;
      emailDestino = data?.email || user.email;

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
          email_resgate_erro:
            emailError?.message || "Erro desconhecido ao enviar email",
        })
        .eq("id", resgate.id);
    }

    try {
      const telegramMessage = `
🎁 <b>NOVO RESGATE DE RECOMPENSA</b>
━━━━━━━━━━━━━━━━━━━━━━

👤 <b>Usuário:</b> ${formatText(userData?.name || "Cliente")}
📧 <b>Email:</b> ${formatText(emailDestino)}
🆔 <b>User ID:</b> <code>${formatText(user_id)}</code>

🏷️ <b>Gift Card:</b> ${formatText(giftcard?.nome || "Gift Card")}
📦 <b>Opção:</b> ${formatText(opcao?.descricao || "Opção selecionada")}

💰 <b>Saldo anterior:</b> ${formatInt(saldoAtual)}
💎 <b>Pontos usados:</b> ${formatInt(opcao?.pontos)}
💵 <b>Saldo restante:</b> ${formatInt(novoSaldo)}

📄 <b>Resgate ID:</b> <code>${formatText(resgate.id)}</code>
📌 <b>Status:</b> <b>PENDENTE</b>
⏳ <b>Prazo:</b> ${formatText(prazoEntrega)}

━━━━━━━━━━━━━━━━━━━━━━
🕒 <i>${new Date().toLocaleString("pt-BR")}</i>
`;

      const telegramResult = await sendTelegramMessage(
        telegramMessage,
        TELEGRAM_RESGATES
      );

      console.log("Resultado Telegram resgate:", telegramResult);
    } catch (telegramError) {
      console.error("Erro ao enviar Telegram de resgate:", telegramError);
    }

    return NextResponse.json({
      success: true,
      resgate_id: resgate.id,
      xp_gained: xpTotal || undefined,
      leveled_up: leveledUp || undefined,
      new_level: newLevel || undefined,
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