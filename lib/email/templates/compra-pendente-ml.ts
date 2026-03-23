type CompraPendenteMLEmailProps = {
  userName: string;
  produtoNome: string;
  status: string;
  prazoDias: number;
  dataLimite: string;
  diasRestantes: number;
  produtoImageUrl?: string;
  dashboardUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

function getTituloStatus(status: string) {
  switch (status) {
    case "AGUARDANDO_RESPOSTA_CANCELADO":
      return "Sua compra precisa de confirmação";
    case "SOLICITAR_PROVA":
      return "Precisamos de uma comprovação da sua compra";
    case "AGUARDANDO_CONFIRMACAO":
      return "Sua compra está aguardando sua resposta";
    default:
      return "Há uma pendência na sua compra";
  }
}

function getDescricaoStatus(status: string) {
  switch (status) {
    case "AGUARDANDO_RESPOSTA_CANCELADO":
      return "Identificamos uma pendência relacionada ao possível cancelamento da compra. Precisamos da sua resposta para continuar a análise.";
    case "SOLICITAR_PROVA":
      return "Para continuar a validação da sua compra, precisamos que você envie uma comprovação dentro da plataforma.";
    case "AGUARDANDO_CONFIRMACAO":
      return "Sua compra está aguardando uma confirmação sua para que possamos seguir com a análise.";
    default:
      return "Existe uma pendência relacionada à sua compra e precisamos da sua resposta.";
  }
}

function getLabelStatus(status: string) {
  switch (status) {
    case "AGUARDANDO_RESPOSTA_CANCELADO":
      return "Aguardando resposta sobre cancelamento";
    case "SOLICITAR_PROVA":
      return "Solicitação de prova";
    case "AGUARDANDO_CONFIRMACAO":
      return "Aguardando confirmação";
    default:
      return status;
  }
}

function getTempoRestanteLabel(diasRestantes: number) {
  if (diasRestantes < 0) return "Prazo expirado";
  if (diasRestantes === 0) return "Último dia para responder";
  if (diasRestantes === 1) return "1 dia restante";
  return `${diasRestantes} dias restantes`;
}

export function getCompraPendenteMLEmailTemplate({
  userName,
  produtoNome,
  status,
  prazoDias,
  dataLimite,
  diasRestantes,
  produtoImageUrl,
  dashboardUrl,
  siteUrl,
  suporteUrl,
}: CompraPendenteMLEmailProps) {
  const titulo = getTituloStatus(status);
  const descricao = getDescricaoStatus(status);
  const statusLabel = getLabelStatus(status);
  const tempoRestante = getTempoRestanteLabel(diasRestantes);

  return `
<!DOCTYPE html>
<html>
<head>
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pendência na sua compra</title>
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
              border:1px solid #f59e0b;
              overflow:hidden;
              width:600px;
              max-width:600px;">

<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="160"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
⚠️ Ação necessária
</h1>

<p style="color:#fbbf24; margin-top:8px; font-size:14px;">
Sua compra do Mercado Livre precisa da sua resposta
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${userName}!
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Identificamos uma pendência em uma compra vinculada à <strong style="color:#ffffff;">BuyGain</strong>.
</p>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
<strong style="color:#fbbf24;">${titulo}</strong>
</p>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
${descricao}
</p>

${
  produtoImageUrl
    ? `
<div style="text-align:center; margin:30px 0;">
  <img src="${produtoImageUrl}"
       alt="${produtoNome}"
       width="220"
       style="display:inline-block; max-width:100%; border-radius:16px; border:1px solid #1e293b;" />
</div>
`
    : ""
}

<div style="background-color:#0b1220;
            border:1px solid #f59e0b;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#fbbf24; font-size:14px; margin:0 0 18px 0;">
🧾 Detalhes da pendência
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Loja:</strong> Mercado Livre
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Produto:</strong> ${produtoNome}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Status:</strong> ${statusLabel}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Prazo:</strong> ${prazoDias} dia(s)
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Responder até:</strong> ${dataLimite}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Tempo restante:</strong> ${tempoRestante}
</p>

</div>

<div style="background-color:#111827;
            border:1px solid #06b6d4;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 10px 0;">
📌 O que fazer agora
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Acesse seu dashboard na BuyGain. Ao abrir a plataforma, o modal da pendência será exibido automaticamente para você responder.
</p>

</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${dashboardUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#f59e0b;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Ir para o dashboard
  </a>
</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Caso você já tenha respondido recentemente, pode desconsiderar este email.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${dashboardUrl}" style="color:#22d3ee; text-decoration:none;">Abrir dashboard</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Se você não reconhece esta compra, entre em contato com o suporte da BuyGain.
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