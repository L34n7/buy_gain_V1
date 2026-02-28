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

        // 🚀 NOTIFICAÇÃO DE LEVEL UP
        if (conquista.subiu_level) {
          await supabaseAdmin.from("notificacoes").insert({
            user_id: userId,
            tipo: "LEVEL_UP",
            titulo: "🚀 Novo nível alcançado!",
            descricao: `Você alcançou o nível ${conquista.novo_level}!`,
            lida: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return data || null;

  } catch (err) {
    console.error("Erro inesperado ao verificar conquistas:", err);
    return null;
  }
}