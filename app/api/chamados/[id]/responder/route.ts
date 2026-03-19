import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: chamadoId } = await context.params;
    const body = await req.json();

    const mensagem = String(body?.mensagem || "").trim();
    const imagemBase64 = body?.imagemBase64 || null;
    const imagemNome = body?.imagemNome || null;
    const imagemTipo = body?.imagemTipo || null;

    if (!mensagem || mensagem.length < 3) {
      return NextResponse.json(
        { error: "A resposta deve ter pelo menos 3 caracteres." },
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
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const admin = await createAdminSupabase();

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id, nickname, name, email")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth." },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    const { data: chamado, error: chamadoError } = await admin
      .from("chamados_suporte")
      .select("id, titulo, status")
      .eq("id", chamadoId)
      .eq("user_id", user_id)
      .single();

    if (chamadoError || !chamado) {
      return NextResponse.json(
        { error: "Chamado não encontrado." },
        { status: 404 }
      );
    }

    if (chamado.status === "FINALIZADO") {
      return NextResponse.json(
        {
          error:
            "Este chamado já foi finalizado e não pode mais receber respostas.",
        },
        { status: 400 }
      );
    }

    const { data: respostaAdmin, error: respostaAdminError } = await admin
      .from("chamados_mensagens")
      .select("id")
      .eq("chamado_id", chamadoId)
      .eq("autor_tipo", "ADMIN")
      .limit(1)
      .maybeSingle();

    if (respostaAdminError) {
      console.error(
        "Erro ao validar primeira resposta do admin:",
        respostaAdminError
      );
      return NextResponse.json(
        { error: "Erro ao validar permissões do chamado." },
        { status: 500 }
      );
    }

    if (!respostaAdmin) {
      return NextResponse.json(
        {
          error:
            "Você só pode responder este chamado depois da primeira resposta do suporte.",
        },
        { status: 403 }
      );
    }

    let imagem_path: string | null = null;

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

      const caminhoArquivo = `chamados/${user_id}/respostas/${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await admin.storage
        .from("chamados-suporte")
        .upload(caminhoArquivo, buffer, {
          contentType: imagemTipo,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro upload imagem resposta usuário:", uploadError);
        return NextResponse.json(
          { error: "Erro ao enviar a imagem da resposta." },
          { status: 500 }
        );
      }

      imagem_path = caminhoArquivo;
    }

    const agora = new Date().toISOString();

    const { error: insertMensagemError } = await admin
      .from("chamados_mensagens")
      .insert({
        chamado_id: chamadoId,
        user_id,
        admin_id: null,
        autor_tipo: "USER",
        mensagem,
        imagem_path,
        criado_em: agora,
      });

    if (insertMensagemError) {
      console.error("Erro ao inserir resposta do chamado:", insertMensagemError);
      return NextResponse.json(
        { error: "Erro ao salvar a resposta do chamado." },
        { status: 500 }
      );
    }

    const { error: updateChamadoError } = await admin
      .from("chamados_suporte")
      .update({
        status: "EM_ANALISE",
      })
      .eq("id", chamadoId);

    if (updateChamadoError) {
      console.error("Erro ao atualizar status do chamado:", updateChamadoError);
      return NextResponse.json(
        {
          error:
            "A resposta foi salva, mas houve erro ao atualizar o chamado.",
        },
        { status: 500 }
      );
    }

    // Notificação Telegram (não quebra a API se falhar)
    try {
      const userName =
        (legacyUser?.nickname && legacyUser.nickname.trim()) ||
        (legacyUser?.name && legacyUser.name.trim()) ||
        user.email?.split("@")[0] ||
        "Jogador";

      const userEmail = legacyUser?.email?.trim() || user.email;

      const mensagemPreview =
        mensagem.length > 500 ? `${mensagem.slice(0, 500)}...` : mensagem;

      const telegramMessage = [
        `<b>💬 Nova resposta do usuário</b>`,
        ``,
        `<b>Protocolo:</b> <code>${escapeHtml(chamadoId)}</code>`,
        `<b>Usuário:</b> ${escapeHtml(userName)}`,
        userEmail ? `<b>Email:</b> ${escapeHtml(userEmail)}` : null,
        chamado.titulo ? `<b>Título:</b> ${escapeHtml(chamado.titulo)}` : null,
        `<b>Status:</b> EM_ANALISE`,
        `<b>Data:</b> ${escapeHtml(formatTelegramDate(agora))}`,
        `<b>Imagem anexada:</b> ${imagem_path ? "Sim" : "Não"}`,
        ``,
        `<b>Mensagem:</b>`,
        escapeHtml(mensagemPreview),
      ]
        .filter(Boolean)
        .join("\n");

      await sendTelegramMessage(telegramMessage);
    } catch (telegramError) {
      console.error(
        "Erro ao enviar notificação Telegram da resposta do chamado:",
        telegramError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Resposta enviada com sucesso.",
    });
  } catch (err) {
    console.error("Erro API responder chamado:", err);
    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}