type AvaliacaoPlataformaEmailProps = {
  userName: string;
  avaliacaoUrl: string;
  comprasUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

export function getAvaliacaoPlataformaEmailTemplate({
  userName,
  avaliacaoUrl,
  comprasUrl,
  siteUrl,
  suporteUrl,
}: AvaliacaoPlataformaEmailProps) {
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
              border:1px solid #06b6d4;
              overflow:hidden;">

<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="160"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
⭐ Avalie sua experiência
</h1>

<p style="color:#22d3ee; margin-top:8px; font-size:14px;">
Sua opinião ajuda a melhorar a BuyGain
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${userName}! 👋
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Vimos que sua primeira compra já foi concluída com sucesso na <strong style="color:#ffffff;">BuyGain</strong>.
</p>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Agora queremos ouvir você: como foi sua experiência usando a plataforma?
</p>

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 12px 0;">
💬 Seu feedback é importante
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Sua avaliação nos ajuda a melhorar a experiência da plataforma e evoluir cada detalhe para os usuários.
</p>

</div>

<div style="background-color:#07131f;
            border:1px solid #1d4ed8;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#60a5fa; font-size:14px; margin:0 0 12px 0;">
⭐ Avaliação rápida
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Leva só alguns segundos para enviar sua nota e um comentário opcional.
</p>

</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${avaliacaoUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#06b6d4;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Avaliar plataforma
  </a>
</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Obrigado por fazer parte da BuyGain.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${comprasUrl}" style="color:#22d3ee; text-decoration:none;">Ver compras</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Se você já enviou sua avaliação, pode desconsiderar esta mensagem.
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