type BonusUser = {
  level_bonus_percent: number | string | null;
  level_bonus_expires_at: string | null;
};

export function getBonusAtivo(user: BonusUser) {
  const agora = new Date();

  const expiraEm = user.level_bonus_expires_at
    ? new Date(user.level_bonus_expires_at)
    : null;

  const ativo =
    !!expiraEm &&
    expiraEm.getTime() > agora.getTime() &&
    Number(user.level_bonus_percent || 0) > 0;

  return {
    ativo,
    bonusPercent: ativo ? Number(user.level_bonus_percent || 0) : 0,
    bonusSource: ativo ? "LEVEL_UP_3_DIAS" : null,
    bonusExpiresAt: expiraEm ? expiraEm.toISOString() : null,
  };
}