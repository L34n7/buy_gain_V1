type ConquistaSemanaItem = {
  titulo: string;
  descricao: string | null;
  xpRecompensa: number;
  desbloqueadaEm: string;
};

type ConquistasSemanaEmailProps = {
  userName: string;
  totalConquistas: number;
  totalXpSemana: number;
  levelAtual: number;
  xpAtual: number;
  xpTotal: number;
  xpNecessarioProximoNivel: number;
  xpFaltaProximoNivel: number;
  perfilUrl: string;
  siteUrl: string;
  suporteUrl: string;
  conquistas: ConquistaSemanaItem[];
};

function formatarDataBR(dataIso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dataIso));
  } catch {
    return dataIso;
  }
}

export function getConquistasSemanaEmailTemplate({
  userName,
  totalConquistas,
  totalXpSemana,
  levelAtual,
  xpAtual,
  xpTotal,
  xpNecessarioProximoNivel,
  xpFaltaProximoNivel,
  perfilUrl,
  siteUrl,
  suporteUrl,
  conquistas,
}: ConquistasSemanaEmailProps) {
  const cardsConquistas = conquistas
    .map(
      (conquista) => `
      <div style="background-color:#0b1220;
                  border:1px solid #1e293b;
                  border-radius:14px;
                  padding:18px;
                  margin:0 0 16px 0;">

        <p style="color:#22c55e; font-size:13px; margin:0 0 10px 0;">
          🏅 Conquista desbloqueada
        </p>

        <p style="color:#ffffff; font-size:18px; font-weight:bold; margin:0 0 10px 0;">
          ${conquista.titulo}
        </p>

        ${
          conquista.descricao
            ? `
        <p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin:0 0 12px 0;">
          ${conquista.descricao}
        </p>
        `
            : ""
        }

        <p style="color:#e2e8f0; font-size:14px; margin:0 0 8px 0;">
          <strong style="color:#ffffff;">XP ganho:</strong> +${conquista.xpRecompensa} XP
        </p>

        <p style="color:#94a3b8; font-size:13px; margin:0;">
          Desbloqueada em ${formatarDataBR(conquista.desbloqueadaEm)}
        </p>
      </div>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>

<body bgcolor="#070b14" style="margin:0; padding:0; background-color:#070b14 !important; font-family: Arial, Helvetica, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
       bgcolor="#070b14"
       style="background-color:#070b14 !important; padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
       bgcolor="#0f172a"
       style="background-color:#0f172a !important;
              border-radius:20px;
              border:1px solid #22c55e;
              overflow:hidden;">

<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="160"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:26px; letter-spacing:0.5px;">
🏆 Sua semana de conquistas
</h1>

<p style="color:#4ade80; margin-top:10px; font-size:14px;">
Veja tudo o que você desbloqueou na BuyGain nos últimos 7 dias
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:22px; margin-top:0;">
Parabéns, ${userName}! 🎉
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.7;">
Você teve uma semana incrível na <strong style="color:#ffffff;">BuyGain</strong>.
Confira abaixo o seu resumo de conquistas desbloqueadas e a evolução do seu progresso.
</p>

<div style="background-color:#071a12;
            border:1px solid #22c55e;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22c55e; font-size:14px; margin:0 0 16px 0;">
📈 Resumo da semana
</p>

<p style="color:#ffffff; font-size:18px; margin:0 0 10px 0;">
<strong>${totalConquistas}</strong> conquista${totalConquistas === 1 ? "" : "s"} desbloqueada${totalConquistas === 1 ? "" : "s"}
</p>

<p style="color:#e2e8f0; font-size:16px; margin:0;">
<strong style="color:#22c55e;">+${totalXpSemana} XP</strong> ganho${totalXpSemana === 1 ? "" : "s"} na semana
</p>

</div>

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 16px 0;">
🚀 Seu progresso atual
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 10px 0;">
<strong style="color:#ffffff;">Nível atual:</strong> ${levelAtual}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 10px 0;">
<strong style="color:#ffffff;">XP total:</strong> ${xpTotal}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 10px 0;">
<strong style="color:#ffffff;">XP no nível atual:</strong> ${xpAtual} / ${xpNecessarioProximoNivel}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Faltam:</strong> ${xpFaltaProximoNivel} XP para o próximo nível
</p>

</div>

<div style="background-color:#1a1325;
            border:1px solid #a855f7;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#c084fc; font-size:14px; margin:0 0 12px 0;">
✨ Dica para evoluir mais rápido
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.7; margin:0;">
Continue desbloqueando conquistas para ganhar XP e subir de nível.
</p>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin:10px 0 0 0;">
Sempre que você sobe de nível, ativa um bônus de <strong style="color:#ffffff;">+5% a mais de PONTOS nas suas compras por 3 dias</strong>.
</p>

</div>

<div style="margin:30px 0;">
  <p style="color:#4ade80; font-size:14px; margin:0 0 16px 0;">
    🏅 Conquistas desbloqueadas na semana
  </p>

  ${cardsConquistas}
</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${perfilUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#22c55e;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Ver meu perfil
  </a>
</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Continue avançando, desbloqueando conquistas e evoluindo na BuyGain.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${perfilUrl}" style="color:#22d3ee; text-decoration:none;">Ver perfil</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

</td>
</tr>

<tr>
<td align="center"
    bgcolor="#0b1220"
    style="background-color:#0b1220 !important;
           padding:25px;
           font-size:12px;
           color:#6b7280;">

© 2026 BuyGain • Plataforma de recompensas inteligente<br>
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">buygain.com.br</a><br>
Cole seu link. Ganhe recompensas.

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `;
}