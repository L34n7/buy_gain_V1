import { NextResponse } from "next/server";
import {
  createAdminSupabase,
  createUserSupabase,
} from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getChamadoRespondidoEmailTemplate } from "@/lib/email/templates/chamado-respondido";

type MensagemChamadoRow = {
  id: string;
  chamado_id: string;
  user_id: string | null;
  admin_id: string | null;
  autor_tipo: "USER" | "ADMIN";
  mensagem: string;
  imagem_path: string | null;
  criado_em: string;
};

export async function POST(req: Request) {
  try {
    const {
      chamado_id,
      resposta,
      status,
      imagemBase64,
      imagemNome,
      imagemTipo,
    } = await req.json();

    const respostaLimpa = String(resposta || "").trim();

    if (!chamado_id || !respostaLimpa) {
      return NextResponse.json(
        { error: "Dados obrigatórios não informados" },
        { status: 400 }
      );
    }

    const statusPermitidos = ["EM_ANALISE", "RESPONDIDO", "FINALIZADO"];
    const statusFinal = statusPermitidos.includes(status)
      ? status
      : "RESPONDIDO";

    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const admin = await createAdminSupabase();

    const { data: adminUser } = await admin
      .from("users")
      .select("id, admin, name, nickname")
      .eq("auth_user_id", user.id)
      .single();

    if (!adminUser || !adminUser.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { data: chamado, error: chamadoError } = await admin
      .from("chamados_suporte")
      .select("id, user_id, titulo, status")
      .eq("id", chamado_id)
      .single();

    if (chamadoError || !chamado) {
      return NextResponse.json(
        { error: "Chamado não encontrado" },
        { status: 404 }
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

      const caminhoArquivo = `chamados/admin/${adminUser.id}/${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await admin.storage
        .from("chamados-suporte")
        .upload(caminhoArquivo, buffer, {
          contentType: imagemTipo,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro upload imagem resposta admin:", uploadError);
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
        chamado_id,
        user_id: null,
        admin_id: adminUser.id,
        autor_tipo: "ADMIN",
        mensagem: respostaLimpa,
        imagem_path,
        criado_em: agora,
      });

    if (insertMensagemError) {
      console.error("Erro ao inserir resposta do admin:", insertMensagemError);
      return NextResponse.json(
        { error: "Erro ao salvar resposta do chamado" },
        { status: 500 }
      );
    }

    const { error: updateError } = await admin
      .from("chamados_suporte")
      .update({
        status: statusFinal,
      })
      .eq("id", chamado_id);

    if (updateError) {
      console.error("Erro ao atualizar chamado:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar chamado" },
        { status: 500 }
      );
    }

    const { data: userData } = await admin
      .from("users")
      .select("auth_user_id, email, name, nickname")
      .eq("id", chamado.user_id)
      .single();

    if (userData?.auth_user_id) {
      const nomeAdmin =
        adminUser.nickname || adminUser.name || "Suporte BuyGain";

      await admin.from("notificacoes").insert({
        user_id: userData.auth_user_id,
        titulo: "💬 Seu chamado foi atualizado",
        tipo: "CHAMADO_ATUALIZADO",
        descricao: `Seu chamado "${chamado.titulo || "Sem título"}" recebeu uma resposta da equipe ${nomeAdmin}.`,
        lida: false,
      });
    }

    const { data: mensagensChamado } = await admin
      .from("chamados_mensagens")
      .select(
        "id, chamado_id, user_id, admin_id, autor_tipo, mensagem, imagem_path, criado_em"
      )
      .eq("chamado_id", chamado_id)
      .order("criado_em", { ascending: true });

    const primeiraMensagemUsuario = (
      (mensagensChamado || []) as MensagemChamadoRow[]
    ).find((msg) => msg.autor_tipo === "USER");

    const siteUrl = process.env.SITE_URL || "https://buygain.com.br";
    const meusChamadosUrl = `${siteUrl}/dashboard/ajuda/meus-chamados`;
    const suporteUrl = `${siteUrl}/dashboard/ajuda`;

    const userName =
      (userData?.nickname && userData.nickname.trim()) ||
      (userData?.name && userData.name.trim()) ||
      userData?.email?.split("@")[0] ||
      "Jogador";

    const userEmail = userData?.email?.trim();

    if (userEmail) {
      try {
        const html = getChamadoRespondidoEmailTemplate({
          userName,
          protocolo: chamado.id,
          titulo: chamado.titulo || null,
          mensagemOriginal: primeiraMensagemUsuario?.mensagem || "",
          respostaSuporte: respostaLimpa,
          meusChamadosUrl,
          siteUrl,
          suporteUrl,
        });

        await sendEmail({
          to: userEmail,
          subject: `Seu chamado foi respondido • Protocolo ${chamado.id}`,
          html,
        });
      } catch (emailError) {
        console.error(
          "Erro ao enviar email de resposta do chamado:",
          emailError
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao responder chamado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}