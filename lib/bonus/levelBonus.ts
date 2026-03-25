import { SupabaseClient } from "@supabase/supabase-js";

type ExtenderBonusParams = {
  admin: SupabaseClient;
  authUserId: string;
  levelsGanhos?: number;
};

export async function extenderBonusLevel({
  admin,
  authUserId,
  levelsGanhos = 1,
}: ExtenderBonusParams) {
  const diasParaSomar = 3 * levelsGanhos;
  const agora = new Date();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id, level_bonus_percent, level_bonus_expires_at, level_bonus_days_total")
    .eq("auth_user_id", authUserId)
    .single();

  if (userError || !user) {
    throw new Error("Usuário não encontrado para aplicar bônus de level.");
  }

  let baseDate = agora;

  if (user.level_bonus_expires_at) {
    const expiraEm = new Date(user.level_bonus_expires_at);

    if (expiraEm.getTime() > agora.getTime()) {
      baseDate = expiraEm;
    }
  }

  const novaExpiracao = new Date(baseDate.getTime());
  novaExpiracao.setDate(novaExpiracao.getDate() + diasParaSomar);

  const novoTotalDias = (user.level_bonus_days_total || 0) + diasParaSomar;

  const { error: updateError } = await admin
    .from("users")
    .update({
      level_bonus_percent: 10,
      level_bonus_expires_at: novaExpiracao.toISOString(),
      level_bonus_days_total: novoTotalDias,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", authUserId);

  if (updateError) {
    throw new Error("Erro ao atualizar bônus de level.");
  }

  return {
    bonus_percent: 10,
    dias_somados: diasParaSomar,
    bonus_expires_at: novaExpiracao.toISOString(),
    level_bonus_days_total: novoTotalDias,
  };
}