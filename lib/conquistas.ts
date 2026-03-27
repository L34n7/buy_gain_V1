import { sendEmail } from "@/lib/email/sendEmail";
import { getLevelUpEmailTemplate } from "@/lib/email/templates/LevelUp";

export async function triggerConquistas(
  supabaseAdmin: any,
  userId: string
) {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "verificar_conquistas_usuario",
      { p_auth_user_id: userId }
    );

    if (error) {
      console.error("Erro ao verificar conquistas:", error);
      return null;
    }

    if (Array.isArray(data?.conquistas)) {
      for (const conquista of data.conquistas) {
        // 🏆 NOTIFICAÇÃO DE CONQUISTA
        await supabaseAdmin.from("notificacoes").insert({
          user_id: userId,
          tipo: "CONQUISTA",
          titulo: "🏆 Nova conquista desbloqueada!",
          descricao: `${conquista.titulo} — +${conquista.xp_ganho} XP`,
          lida: false,
          created_at: new Date().toISOString(),
        });

        // 🚀 NOTIFICAÇÃO DE LEVEL UP + EMAIL
        if (conquista.subiu_level) {
          await supabaseAdmin.from("notificacoes").insert({
            user_id: userId,
            tipo: "LEVEL_UP",
            titulo: "🚀 Novo nível alcançado!",
            descricao: `Você alcançou o nível ${conquista.novo_level}!`,
            lida: false,
            created_at: new Date().toISOString(),
          });

          try {
            // Buscar usuário
            const { data: usuario, error: userError } = await supabaseAdmin
              .from("users")
              .select("email, nickname, name")
              .eq("auth_user_id", userId)
              .maybeSingle();

            if (userError) {
              console.error("Erro ao buscar usuário para email level up:", userError);
              continue;
            }

            if (!usuario?.email) {
              continue;
            }

            // Buscar último histórico de level up ainda não enviado
            const { data: historico, error: historicoError } = await supabaseAdmin
              .from("user_progress_historico")
              .select("id, level_anterior, level_novo, xp_atual, xp_proximo_level")
              .eq("auth_user_id", userId)
              .eq("email_levelup", false)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (historicoError) {
              console.error("Erro ao buscar histórico de level up:", historicoError);
              continue;
            }

            if (!historico) {
              continue;
            }

            const nome = usuario.nickname || usuario.name || "cliente";
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://buygain.com.br";
            const perfilUrl = `${siteUrl}/dashboard/perfil`;
            const suporteUrl = `${siteUrl}/dashboard/ajuda`;

            const html = getLevelUpEmailTemplate({
              userName: nome,
              novoLevel: historico.level_novo,
              conquistaTitulo: conquista.titulo,
              xpGanho: conquista.xp_ganho,
              xpAtual: historico.xp_atual,
              xpProximoLevel: historico.xp_proximo_level,
              perfilUrl,
              siteUrl,
              suporteUrl,
            });

            await sendEmail({
              to: usuario.email,
              subject: `🚀 Você alcançou o nível ${historico.level_novo} na BuyGain!`,
              html,
            });

            await supabaseAdmin
              .from("user_progress_historico")
              .update({
                email_levelup: true,
                data_email_levelup: new Date().toISOString(),
              })
              .eq("id", historico.id);

          } catch (emailErr) {
            console.error("Erro ao enviar email de level up:", emailErr);
          }
        }
      }
    }

    return data || null;
  } catch (err) {
    console.error("Erro inesperado ao verificar conquistas:", err);
    return null;
  }
}