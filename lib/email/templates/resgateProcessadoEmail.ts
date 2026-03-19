type ResgateProcessadoEmailProps = {
  userName: string;
  resgateId: string;
  giftcardNome: string;
  opcaoLabel: string;
  giftcardImageUrl?: string;
  inventarioUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

export function getResgateProcessadoEmailTemplate({
  userName,
  resgateId,
  giftcardNome,
  opcaoLabel,
  giftcardImageUrl,
  inventarioUrl,
  siteUrl,
  suporteUrl,
}: ResgateProcessadoEmailProps) {
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
Recompensa liberada 🎁
</h1>

<p style="color:#22d3ee; margin-top:8px; font-size:14px;">
Seu gift card já está disponível no seu inventário
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${userName}!
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Seu resgate foi processado com sucesso pela equipe da <strong style="color:#ffffff;">BuyGain</strong>.
O código da sua recompensa já está disponível para visualização no seu inventário.
</p>

${
  giftcardImageUrl
    ? `
<div style="text-align:center; margin:30px 0;">
  <img src="${giftcardImageUrl}"
       alt="${giftcardNome}"
       width="220"
       style="display:inline-block; max-width:100%; border-radius:16px; border:1px solid #1e293b;" />
</div>
`
    : ""
}

<div style="background-color:#0b1220;
            border:1px solid #7c3aed;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#a78bfa; font-size:14px; margin:0 0 18px 0;">
⚡ Resumo da recompensa liberada
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Número do resgate:</strong> #${resgateId}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Recompensa:</strong> ${giftcardNome}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Opção selecionada:</strong> ${opcaoLabel}
</p>

<p style="color:#34d399; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Status atual:</strong> CONCLUÍDO
</p>

</div>

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 10px 0;">
📦 Onde acessar seu código
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Entre na sua conta e acesse a área de <strong style="color:#ffffff;">inventário</strong> para visualizar o código do seu gift card.
</p>

</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${inventarioUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#06b6d4;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Abrir meu inventário
  </a>
</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Guarde seu código com segurança e siga as instruções da plataforma parceira para utilizá-lo corretamente.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${inventarioUrl}" style="color:#22d3ee; text-decoration:none;">Ver inventário</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Se você não reconhece esta solicitação, entre em contato com o suporte da BuyGain.
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