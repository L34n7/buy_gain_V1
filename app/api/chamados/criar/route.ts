import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getChamadoAbertoEmailTemplate } from "@/lib/email/templates/chamado-aberto";

export async function POST(req: Request) {
  try {
    const {
      titulo,
      mensagem,
      imagemBase64,
      imagemNome,
      imagemTipo,
    } = await req.json();

    if (!mensagem || mensagem.trim().length < 10) {
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

      const partes = imagemBase64.split(",");
      if (partes.length < 2) {
        return NextResponse.json(
          { error: "Imagem inválida." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(partes[1], "base64");

      // 5 MB
      const maxBytes = 5 * 1024 * 1024;
      if (buffer.length > maxBytes) {
        return NextResponse.json(
          { error: "A imagem deve ter no máximo 5MB." },
          { status: 400 }
        );
      }

      const extensao =
        imagemNome.split(".").pop()?.toLowerCase() ||
        (imagemTipo === "image/png"
          ? "png"
          : imagemTipo === "image/webp"
          ? "webp"
          : "jpg");

      const nomeSeguro = imagemNome
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

    // 5️⃣ Insere chamado
    const agora = new Date().toISOString();

    const { data: chamado, error: insertError } = await admin
      .from("chamados_suporte")
      .insert({
        user_id,
        titulo: titulo?.trim() || null,
        mensagem: mensagem.trim(),
        imagem_path,
        status: "ABERTO",
        criado_em: agora,
        data_update: agora,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Erro ao salvar chamado:", insertError);
      return NextResponse.json(
        { error: "Erro ao salvar chamado." },
        { status: 500 }
      );
    }


    const siteUrl = process.env.SITE_URL || "https://buygain.com.br/dashboard";
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
          titulo: titulo?.trim() || null,
          mensagem: mensagem.trim(),
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