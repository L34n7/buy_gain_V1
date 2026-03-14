type ResgateRewardEmailProps = {
  userName: string;
  resgateId: string;
  giftcardNome: string;
  opcaoLabel: string;
  pontosUsados: number;
  saldoRestante: number;
  prazoEntrega: string;
};

function formatPoints(value: number) {
  return value.toLocaleString("pt-BR");
}

export function getResgateRewardEmailTemplate({
  userName,
  resgateId,
  giftcardNome,
  opcaoLabel,
  pontosUsados,
  saldoRestante,
  prazoEntrega,
}: ResgateRewardEmailProps) {
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

<!-- HEADER -->
<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="180"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
Resgate confirmado 🎉
</h1>

<p style="color:#22d3ee; margin-top:8px; font-size:14px;">
Seu pedido foi recebido e já está em processamento
</p>

</td>
</tr>

<!-- CONTEÚDO -->
<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${userName}!
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Recebemos com sucesso o seu pedido de resgate na <strong style="color:#ffffff;">BuyGain</strong>.
Seu resgate foi registrado e está aguardando processamento.
</p>

<!-- BOX PRINCIPAL -->
<div style="background-color:#0b1220;
            border:1px solid #7c3aed;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#a78bfa; font-size:14px; margin:0 0 18px 0;">
⚡ Resumo do seu resgate
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

<p style="color:#22d3ee; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Pontos utilizados:</strong> ${formatPoints(pontosUsados)}
</p>

<p style="color:#22d3ee; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Saldo restante:</strong> ${formatPoints(saldoRestante)}
</p>

<p style="color:#fbbf24; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Status atual:</strong> PENDENTE
</p>

</div>

<!-- PRAZO -->
<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 10px 0;">
⏳ Prazo para recebimento
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
O código do seu gift card será enviado em <strong style="color:#ffffff;">${prazoEntrega}</strong>,
após a validação e processamento do resgate.
</p>

</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Você poderá acompanhar o andamento do resgate diretamente pela plataforma.
Assim que o processamento for concluído, enviaremos as próximas instruções.
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Se você não reconhece esta solicitação, entre em contato com o suporte da BuyGain.
</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center"
    bgcolor="#0b1220"
    style="background-color:#0b1220 !important;
           padding:25px;
           font-size:12px;
           color:#6b7280;">

© 2026 BuyGain • Plataforma de recompensas inteligente<br>
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