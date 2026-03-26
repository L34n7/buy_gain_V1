import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getChamadoAbertoEmailTemplate } from "@/lib/email/templates/chamado-aberto";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";
import { TELEGRAM_CHAMADOS } from "@/lib/telegram/config";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTelegramDate(date: string) {
  try {
    return new Date(date).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return date;
  }
}

export async function POST(req: Request) {
  try {
    const {
      titulo,
      mensagem,
      imagemBase64,
      imagemNome,
      imagemTipo,
    } = await req.json();

    const tituloLimpo = String(titulo || "").trim();
    const mensagemLimpa = String(mensagem || "").trim();

    if (!tituloLimpo || tituloLimpo.length < 3) {
      return NextResponse.json(
        { error: "O título é obrigatório e deve ter pelo menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (!mensagemLimpa || mensagemLimpa.length < 10) {
      return NextResponse.json(
        { error: "A mensagem deve ter pelo menos 10 caracteres." },
        { status: 400 }
      );
    }

    // 1️⃣ Supabase do usuário
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

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Busca usuário legado (users.id)
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id, nickname, name, email")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    let imagem_path: string | null = null;

    // 4️⃣ Upload da imagem, se enviada
    if (imagemBase64 && imagemNome && imagemTipo) {
      const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];

      if (!tiposPermitidos.includes(imagemTipo)) {
        return NextResponse.json(
          { error: "Formato de imagem inválido. Envie PNG, JPG ou WEBP." },
          { status: 400 }
        );
      }

      const partes = String(imagemBase64).split(",");
      if (partes.length < 2) {
        return NextResponse.json(
          { error: "Imagem inválida." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(partes[1], "base64");

      const maxBytes = 5 * 1024 * 1024;
      if (buffer.length > maxBytes) {
        return NextResponse.json(
          { error: "A imagem deve ter no máximo 5MB." },
          { status: 400 }
        );
      }

      const nomeSeguro = String(imagemNome)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "-");

      const caminhoArquivo = `chamados/${user_id}/${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await admin.storage
        .from("chamados-suporte")
        .upload(caminhoArquivo, buffer, {
          contentType: imagemTipo,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro upload imagem chamado:", uploadError);
        return NextResponse.json(
          { error: "Erro ao enviar a imagem." },
          { status: 500 }
        );
      }

      imagem_path = caminhoArquivo;
    }

    const agora = new Date().toISOString();

    // 5️⃣ Cria o chamado principal
    const { data: chamado, error: insertChamadoError } = await admin
      .from("chamados_suporte")
      .insert({
        user_id,
        titulo: tituloLimpo,
        status: "ABERTO",
        criado_em: agora,
      })
      .select("id")
      .single();

    if (insertChamadoError || !chamado) {
      console.error("Erro ao salvar chamado:", insertChamadoError);
      return NextResponse.json(
        { error: "Erro ao salvar chamado." },
        { status: 500 }
      );
    }

    // 6️⃣ Cria a mensagem inicial do chamado
    const { error: mensagemInicialError } = await admin
      .from("chamados_mensagens")
      .insert({
        chamado_id: chamado.id,
        user_id,
        admin_id: null,
        autor_tipo: "USER",
        mensagem: mensagemLimpa,
        imagem_path,
        criado_em: agora,
      });

    if (mensagemInicialError) {
      console.error(
        "Erro ao salvar mensagem inicial do chamado:",
        mensagemInicialError
      );

      return NextResponse.json(
        { error: "Chamado criado, mas houve erro ao salvar a mensagem inicial." },
        { status: 500 }
      );
    }

    const siteUrl = process.env.SITE_URL || "https://buygain.com.br";
    const meusChamadosUrl = `${siteUrl}/dashboard/ajuda/meus-chamados`;
    const suporteUrl = `${siteUrl}/dashboard/ajuda`;

    const userName =
      (legacyUser?.nickname && legacyUser.nickname.trim()) ||
      (legacyUser?.name && legacyUser.name.trim()) ||
      user.email?.split("@")[0] ||
      "Jogador";

    const userEmail = legacyUser?.email?.trim() || user.email;

    if (userEmail) {
      try {
        const html = getChamadoAbertoEmailTemplate({
          userName,
          protocolo: chamado.id,
          titulo: tituloLimpo,
          mensagem: mensagemLimpa,
          meusChamadosUrl,
          siteUrl,
          suporteUrl,
        });

        await sendEmail({
          to: userEmail,
          subject: `Chamado aberto com sucesso • Protocolo ${chamado.id}`,
          html,
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de chamado aberto:", emailError);
      }
    }

    // 7️⃣ Notificação Telegram (não quebra a API se falhar)
    try {
      const mensagemPreview =
        mensagemLimpa.length > 500
          ? `${mensagemLimpa.slice(0, 500)}...`
          : mensagemLimpa;

      const telegramMessage = [
        `<b>📩 Novo chamado aberto</b>`,
        ``,
        `<b>Protocolo:</b> <code>${escapeHtml(chamado.id)}</code>`,
        `<b>Usuário:</b> ${escapeHtml(userName)}`,
        userEmail ? `<b>Email:</b> ${escapeHtml(userEmail)}` : null,
        `<b>Título:</b> ${escapeHtml(tituloLimpo)}`,
        `<b>Status:</b> ABERTO`,
        `<b>Data:</b> ${escapeHtml(formatTelegramDate(agora))}`,
        `<b>Imagem anexada:</b> ${imagem_path ? "Sim" : "Não"}`,
        ``,
        `<b>Mensagem:</b>`,
        escapeHtml(mensagemPreview),
      ]
        .filter(Boolean)
        .join("\n");

      await sendTelegramMessage(telegramMessage, TELEGRAM_CHAMADOS);
    } catch (telegramError) {
      console.error(
        "Erro ao enviar notificação Telegram do chamado:",
        telegramError
      );
    }

    return NextResponse.json({
      success: true,
      chamado_id: chamado.id,
    });
  } catch (err) {
    console.error("Erro API criar chamado:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}