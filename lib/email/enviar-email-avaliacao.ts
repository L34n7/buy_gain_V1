import { sendEmail } from "@/lib/email/sendEmail";
import { getAvaliacaoPlataformaEmailTemplate } from "@/lib/email/templates/avaliacao-plataforma";

type UsuarioEmailAvaliacao = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  allow_notifications: boolean | null;
  email_avaliacao_enviado: boolean | null;
};

type EnviarEmailAvaliacaoParams = {
  supabaseAdmin: any;
  appUserId: string;
};

export async function enviarEmailAvaliacaoSeNecessario({
  supabaseAdmin,
  appUserId,
}: EnviarEmailAvaliacaoParams) {
  try {
    const { data: usuario, error } = await supabaseAdmin
      .from("users")
      .select("id, name, nickname, email, allow_notifications, email_avaliacao_enviado")
      .eq("id", appUserId)
      .single();

    if (error || !usuario) {
      console.error("Erro ao buscar usuário para email de avaliação:", error);
      return { enviado: false, motivo: "usuario_nao_encontrado" };
    }

    const user = usuario as UsuarioEmailAvaliacao;

    if (!user.email) {
      return { enviado: false, motivo: "sem_email" };
    }

    if (user.email_avaliacao_enviado === true) {
      return { enviado: false, motivo: "ja_enviado" };
    }

    if (user.allow_notifications === false) {
      await supabaseAdmin
        .from("users")
        .update({
          email_avaliacao_enviado: true,
          data_email_avaliacao: new Date().toISOString(),
        })
        .eq("id", appUserId);

      return { enviado: false, motivo: "notificacoes_desativadas" };
    }

    const nome = user.nickname || user.name || "Jogador";

    const html = getAvaliacaoPlataformaEmailTemplate({
      userName: nome,
      avaliacaoUrl: `${process.env.SITE_URL}/dashboard/?avaliar=1`,
      comprasUrl: `${process.env.SITE_URL}/dashboard/compras`,
      siteUrl: `${process.env.SITE_URL}`,
      suporteUrl: `${process.env.SITE_URL}/dashboard/ajuda`,
    });

    await sendEmail({
      to: user.email,
      subject: "Como foi sua experiência na BuyGain?",
      html,
    });

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        email_avaliacao_enviado: true,
        data_email_avaliacao: new Date().toISOString(),
      })
      .eq("id", appUserId);

    if (updateError) {
      console.error("Erro ao atualizar flag do email de avaliação:", updateError);
    }

    return { enviado: true };
  } catch (err) {
    console.error("Erro ao enviar email de avaliação:", err);
    return { enviado: false, motivo: "erro_envio" };
  }
}