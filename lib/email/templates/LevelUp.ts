type LevelUpEmailProps = {
  userName: string;
  novoLevel: number;
  conquistaTitulo?: string;
  xpGanho?: number;
  xpAtual: number;
  xpProximoLevel: number;
  perfilUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

export function getLevelUpEmailTemplate({
  userName,
  novoLevel,
  conquistaTitulo,
  xpGanho,
  xpAtual,
  xpProximoLevel,
  perfilUrl,
  siteUrl,
  suporteUrl,
}: LevelUpEmailProps) {
  const xpGanhoFormatado =
    typeof xpGanho === "number" && Number.isFinite(xpGanho)
      ? Math.floor(xpGanho)
      : 0;

  const faltaParaProximo = Math.max(xpProximoLevel - xpAtual, 0);

  const temConquista = Boolean(conquistaTitulo);
  const temXpGanho = xpGanhoFormatado > 0;

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
              border:1px solid #a855f7;
              overflow:hidden;">

<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="160"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
🚀 Novo nível alcançado!
</h1>

<p style="color:#c084fc; margin-top:8px; font-size:14px;">
Seu progresso evoluiu na BuyGain
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Parabéns, ${userName}! 🎉
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Você alcançou o <strong style="color:#a855f7;">nível ${novoLevel}</strong> na <strong style="color:#ffffff;">BuyGain</strong>.
</p>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Continue desbloqueando conquistas, acumulando XP e evoluindo para conquistar ainda mais recompensas dentro da plataforma.
</p>

${
  temConquista
    ? `
<div style="background-color:#0b1220;
            border:1px solid #a855f7;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#c084fc; font-size:14px; margin:0 0 18px 0;">
🏆 Conquista desbloqueada
</p>

<p style="color:#ffffff; font-size:18px; font-weight:bold; margin:0 0 12px 0;">
${conquistaTitulo}
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Essa conquista contribuiu para a sua evolução de nível dentro da BuyGain.
</p>

</div>
`
    : ""
}

${
  temXpGanho
    ? `
<div style="background-color:#1a1026;
            border:1px solid #a855f7;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#c084fc; font-size:14px; margin:0 0 12px 0;">
⚡ XP ganho
</p>

<p style="color:#ffffff; font-size:26px; font-weight:bold; margin:0 0 12px 0;">
+${xpGanhoFormatado} XP
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Esse XP foi somado ao seu progresso e ajudou você a alcançar um novo nível.
</p>

</div>
`
    : ""
}

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 18px 0;">
📈 Seu progresso atual
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Nível atual:</strong> ${novoLevel}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">XP atual:</strong> ${xpAtual}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">XP para o próximo nível:</strong> ${xpProximoLevel}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Faltam:</strong> ${faltaParaProximo} XP
</p>

</div>

<div style="background-color:#071a12;
            border:1px solid #22c55e;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22c55e; font-size:14px; margin:0 0 12px 0;">
🎁 Benefício de level up
</p>

<p style="color:#ffffff; font-size:18px; font-weight:bold; margin:0 0 12px 0;">
+5% de XP por 3 dias
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Ao subir de nível, você recebe um bônus temporário para acelerar ainda mais a sua evolução na plataforma.
</p>

</div>

<div style="background-color:#0b1220;
            border:1px solid #f59e0b;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#fbbf24; font-size:14px; margin:0 0 10px 0;">
🔥 Continue avançando
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Acesse seu perfil para acompanhar seu nível, XP acumulado e as próximas conquistas que podem acelerar ainda mais sua jornada.
</p>

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
Você está evoluindo muito bem na BuyGain. Continue acumulando compras, pontos, conquistas e subindo de nível.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${perfilUrl}" style="color:#22d3ee; text-decoration:none;">Ver perfil</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Este email foi enviado porque sua conta atingiu um novo nível dentro da BuyGain.
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