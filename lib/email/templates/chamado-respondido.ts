type ChamadoRespondidoEmailProps = {
  userName: string;
  protocolo: string;
  titulo?: string | null;
  mensagemOriginal: string;
  respostaSuporte: string;
  meusChamadosUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

export function getChamadoRespondidoEmailTemplate({
  userName,
  protocolo,
  titulo,
  mensagemOriginal,
  respostaSuporte,
  meusChamadosUrl,
  siteUrl,
  suporteUrl,
}: ChamadoRespondidoEmailProps) {
  const mensagemCurta =
    mensagemOriginal.length > 220
      ? `${mensagemOriginal.slice(0, 220)}...`
      : mensagemOriginal;

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
💬 Seu chamado foi respondido
</h1>

<p style="color:#67e8f9; margin-top:8px; font-size:14px;">
A equipe da BuyGain enviou uma atualização no seu atendimento
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${userName}! 👋
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Seu chamado recebeu uma resposta da equipe de suporte da
<strong style="color:#ffffff;">BuyGain</strong>.
</p>

<div style="background-color:#0b1220;
            border:1px solid #8b5cf6;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#c4b5fd; font-size:14px; margin:0 0 18px 0;">
🧾 Dados do chamado
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Protocolo:</strong> ${protocolo}
</p>

${
  titulo?.trim()
    ? `
<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Título:</strong> ${titulo}
</p>
`
    : ""
}

<p style="color:#e2e8f0; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Resumo:</strong> ${mensagemCurta}
</p>

</div>

<div style="background-color:#111827;
            border:1px solid #06b6d4;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 14px 0;">
📩 Resposta do suporte
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.7; margin:0; white-space:pre-line;">
${respostaSuporte}
</p>

</div>

<div style="background-color:#0f172a;
            border:1px solid #1e293b;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin:0;">
Acesse <strong style="color:#ffffff;">Meus chamados</strong> para acompanhar o status atualizado, consultar a resposta e continuar seu atendimento se necessário.
</p>

</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${meusChamadosUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#06b6d4;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Ver meus chamados
  </a>
</div>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${meusChamadosUrl}" style="color:#22d3ee; text-decoration:none;">Meus chamados</a>
&nbsp;•&nbsp;
<a href="${suporteUrl}" style="color:#22d3ee; text-decoration:none;">Falar com o suporte</a>
</p>

<p style="color:#64748b; font-size:13px; line-height:1.6; margin-top:25px;">
Este é um email automático enviado quando seu chamado recebe uma resposta.
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