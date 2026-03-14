import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { sendResgateProcessadoEmail } from "@/lib/email/sendResgateProcessadoEmail";

/* Abrir modal / preview
GET
Só lê dados (extrato + resgate) */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const resgate_id = searchParams.get("resgate_id");

    if (!resgate_id) {
      return NextResponse.json({ error: "resgate_id obrigatório" }, { status: 400 });
    }

    const admin = await createAdminSupabase();

    // 1️⃣ Buscar resgate
    const { data: resgate } = await admin
      .from("recompensa_resgates")
      .select("id, user_id, pontos_usados")
      .eq("id", resgate_id)
      .single();

    if (!resgate) {
      return NextResponse.json({ error: "Resgate não encontrado" }, { status: 404 });
    }

    // 2️⃣ Ver se já existe débito do resgate
    const { data: debito } = await admin
      .from("extrato_pontos")
      .select("pontos, saldo_apos")
      .eq("origem", "RESGATE_RECOMPENSA")
      .eq("referencia_id", resgate_id)
      .limit(1)
      .maybeSingle();

    let saldoAnterior = 0;
    let saldoAtual = 0;

    if (debito) {
      saldoAtual = debito.saldo_apos;
      saldoAnterior = debito.saldo_apos + debito.pontos;
    } else {
      // 3️⃣ Último saldo do usuário
      const { data: ultimoExtrato } = await admin
        .from("extrato_pontos")
        .select("saldo_apos")
        .eq("user_id", resgate.user_id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();

      saldoAtual = ultimoExtrato?.saldo_apos ?? 0;
      saldoAnterior = saldoAtual + resgate.pontos_usados;
    }

    return NextResponse.json({
      resgate_id,
      pontos_resgate: resgate.pontos_usados,
      saldo_anterior: saldoAnterior,
      saldo_atual: saldoAtual,
    });

  } catch (err) {
    console.error("Erro preview resgate:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/* Confirmar resgate
POST
Grava tudo (código, status) */

export async function POST(req: Request) {
  try {
    const { resgate_id, codigo } = await req.json();

    if (!resgate_id || !codigo) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabaseUser = await createUserSupabase();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const admin = await createAdminSupabase();

    // validar admin
    const { data: adminUser } = await admin
      .from("users")
      .select("id, admin")
      .eq("auth_user_id", user.id)
      .single();

    if (!adminUser || !adminUser.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // buscar resgate
    const { data: resgate } = await admin
      .from("recompensa_resgates")
      .select("id, status, user_id, giftcard_id, giftcard_opcao_id")
      .eq("id", resgate_id)
      .single();

    if (!resgate || resgate.status !== "PENDENTE") {
      return NextResponse.json({ error: "Resgate inválido" }, { status: 400 });
    }

    // inserir código
    await admin.from("recompensa_codigos").insert({
      resgate_id,
      codigo,
    });

    // atualizar resgate
    await admin
      .from("recompensa_resgates")
      .update({
        status: "CONCLUIDO",
        admin_id: adminUser.id,
        processado_em: new Date().toISOString(),
      })
      .eq("id", resgate_id);


    try {
      const { data: userData } = await admin
        .from("users")
        .select("name, email, auth_user_id")
        .eq("id", resgate.user_id)
        .single();

      const { data: giftcard } = await admin
        .from("giftcards")
        .select("nome, imagem, imagem_modal")
        .eq("id", resgate.giftcard_id)
        .single();

      const rawImage = giftcard?.imagem || giftcard?.imagem_modal || "";

      const giftcardImageUrl = rawImage
        ? rawImage.startsWith("http")
          ? rawImage
          : `https://buygain.com.br/${rawImage.replace(/^\/+/, "")}`
        : undefined;

      const { data: opcao } = await admin
        .from("giftcard_opcoes")
        .select("descricao")
        .eq("id", resgate.giftcard_opcao_id)
        .single();

      if (userData?.email) {
        await sendResgateProcessadoEmail({
          to: userData.email,
          userName: userData.name || "Cliente",
          resgateId: String(resgate.id),
          giftcardNome: giftcard?.nome || "Gift Card",
          opcaoLabel: opcao?.descricao || "Opção selecionada",
          giftcardImageUrl,
        });

        // monta descrição da notificação
        const descricaoNotificacao = `Seu ${giftcard?.nome || "Gift Card"} (${opcao?.descricao || "opção selecionada"}) foi liberado e já está disponível no inventário.`;

        // criar notificação para o usuário
        await admin.from("notificacoes").insert({
          user_id: userData.auth_user_id,
          titulo: "🎁 Gift Card liberado",
          tipo: "RECOMPENSA_PROCESSADA",
          descricao: descricaoNotificacao,
          lida: false,
        });


        // ✅ REGISTRA SUCESSO DO EMAIL
        await admin
          .from("recompensa_resgates")
          .update({
            email_processado_enviado: true,
            email_processado_enviado_em: new Date().toISOString(),
            email_processado_erro: null,
          })
          .eq("id", resgate_id);
      }
    }
    catch (emailError: any) {

      console.error("Erro ao enviar email de recompensa processada:", emailError);

      // ❌ REGISTRA ERRO DO EMAIL
      await admin
        .from("recompensa_resgates")
        .update({
          email_processado_enviado: false,
          email_processado_erro: emailError?.message || "Erro ao enviar email",
        })
        .eq("id", resgate_id);

    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro processar resgate:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
