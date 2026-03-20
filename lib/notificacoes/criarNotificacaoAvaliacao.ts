export async function criarNotificacaoAvaliacaoSePrimeiraCompra({
  supabaseAdmin,
  appUserId,
  authUserId,
}: {
  supabaseAdmin: any;
  appUserId: string;
  authUserId: string;
}) {
  try {
    // 1) Verifica se o usuário já avaliou a plataforma
    const { count: totalAvaliacoes, error: avaliacoesError } = await supabaseAdmin
      .from("avaliacoes_plataforma")
      .select("*", { count: "exact", head: true })
      .eq("user_id", appUserId);

    if (avaliacoesError) {
      console.error("Erro ao verificar avaliações da plataforma:", avaliacoesError);
      return { criada: false, motivo: "erro_avaliacoes" };
    }

    if ((totalAvaliacoes || 0) > 0) {
      return { criada: false, motivo: "ja_avaliou" };
    }

    // 2) Conta compras concluídas no Mercado Livre
    const { count: totalMlConcluidas, error: mlError } = await supabaseAdmin
      .from("ml_eventos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", appUserId)
      .eq("status", "CONFIRMADO_FINAL");

    if (mlError) {
      console.error("Erro ao contar compras concluídas do Mercado Livre:", mlError);
      return { criada: false, motivo: "erro_ml" };
    }

    // 3) Conta compras concluídas na Shopee
    const { count: totalShopeeConcluidas, error: shopeeError } = await supabaseAdmin
      .from("shopee_eventos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", appUserId)
      .eq("status", "COMPLETED");

    if (shopeeError) {
      console.error("Erro ao contar compras concluídas da Shopee:", shopeeError);
      return { criada: false, motivo: "erro_shopee" };
    }

    const totalComprasConcluidas =
      (totalMlConcluidas || 0) + (totalShopeeConcluidas || 0);

    // 4) Só continua se for exatamente a primeira compra concluída
    if (totalComprasConcluidas !== 1) {
      return { criada: false, motivo: "nao_e_primeira_compra" };
    }

    // 5) Verifica se já existe notificação desse tipo
    const { count: totalNotificacoes, error: notificacaoError } = await supabaseAdmin
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authUserId)
      .eq("tipo", "AVALIACAO_PLATAFORMA");

    if (notificacaoError) {
      console.error("Erro ao verificar notificação de avaliação:", notificacaoError);
      return { criada: false, motivo: "erro_notificacao" };
    }

    if ((totalNotificacoes || 0) > 0) {
      return { criada: false, motivo: "notificacao_ja_existe" };
    }

    // 6) Cria a notificação
    const { error: insertError } = await supabaseAdmin
      .from("notificacoes")
      .insert({
        user_id: authUserId,
        tipo: "AVALIACAO_PLATAFORMA",
        titulo: "Avalie sua experiência",
        descricao:
          "Sua primeira compra foi concluída. Conte pra gente como foi sua experiência na plataforma.",
        lida: false,
      });

    if (insertError) {
      console.error("Erro ao criar notificação de avaliação:", insertError);
      return { criada: false, motivo: "erro_insert" };
    }

    console.log("Notificação de avaliação criada com sucesso.");
    return { criada: true };
  } catch (error) {
    console.error("Erro inesperado ao criar notificação de avaliação:", error);
    return { criada: false, motivo: "erro_interno" };
  }
}