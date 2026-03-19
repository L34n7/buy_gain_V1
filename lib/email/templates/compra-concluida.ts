type CompraConcluidaEmailProps = {
  userName: string;
  produtoNome: string;
  origem: string;
  produtoImageUrl?: string;
  pontosGanhos?: number;
  comprasUrl: string;
  siteUrl: string;
  suporteUrl: string;
};

export function getCompraConcluidaEmailTemplate({
  userName,
  produtoNome,
  origem,
  produtoImageUrl,
  pontosGanhos,
  comprasUrl,
  siteUrl,
  suporteUrl,
}: CompraConcluidaEmailProps) {
  const pontosFormatados =
    typeof pontosGanhos === "number" && Number.isFinite(pontosGanhos)
      ? Math.floor(pontosGanhos)
      : 0;

  const temPontos = pontosFormatados > 0;

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

<h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
🎉 Compra concluída!
</h1>

<p style="color:#4ade80; margin-top:8px; font-size:14px;">
Seu saldo foi atualizado na BuyGain
</p>

</td>
</tr>

<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Parabéns, ${userName}! 🎉
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Sua compra vinculada à <strong style="color:#ffffff;">BuyGain</strong> foi concluída com sucesso.
</p>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Isso significa que os pontos dessa compra <strong style="color:#22c55e;">já foram creditados no seu saldo</strong> e agora estão disponíveis na plataforma.
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
            border:1px solid #22c55e;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#4ade80; font-size:14px; margin:0 0 18px 0;">
🧾 Detalhes da compra
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0 0 12px 0;">
<strong style="color:#ffffff;">Loja:</strong> ${origem}
</p>

<p style="color:#e2e8f0; font-size:15px; margin:0;">
<strong style="color:#ffffff;">Produto:</strong> ${produtoNome}
</p>

</div>

${
  temPontos
    ? `
<div style="background-color:#071a12;
            border:1px solid #22c55e;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22c55e; font-size:14px; margin:0 0 12px 0;">
💰 Pontos creditados
</p>

<p style="color:#ffffff; font-size:26px; font-weight:bold; margin:0 0 12px 0;">
+${pontosFormatados} pontos
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Esses pontos já foram adicionados ao seu saldo na BuyGain.
</p>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin-top:10px;">
Continue acumulando para trocar por recompensas dentro da plataforma.
</p>

</div>
`
    : `
<div style="background-color:#071a12;
            border:1px solid #22c55e;
            padding:22px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22c55e; font-size:14px; margin:0 0 12px 0;">
💰 Saldo atualizado
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Os pontos dessa compra já foram adicionados ao seu saldo na BuyGain.
</p>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6; margin-top:10px;">
Agora você pode continuar acumulando recompensas dentro da plataforma.
</p>

</div>
`
}

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:20px;
            border-radius:14px;
            margin:30px 0;">

<p style="color:#22d3ee; font-size:14px; margin:0 0 10px 0;">
📦 Acompanhar suas compras
</p>

<p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin:0;">
Você pode acessar sua área de <strong style="color:#ffffff;">compras</strong> para visualizar o histórico completo e acompanhar suas compras concluídas.
</p>

</div>

<div style="text-align:center; margin:35px 0 30px 0;">
  <a href="${comprasUrl}"
     style="display:inline-block;
            padding:16px 32px;
            background-color:#22c55e;
            color:#ffffff;
            font-weight:bold;
            font-size:15px;
            text-decoration:none;
            border-radius:14px;">
    Ver minha compra
  </a>
</div>

<p style="color:#cbd5e1; font-size:15px; line-height:1.6;">
Obrigado por usar a BuyGain e continuar acumulando recompensas.
</p>

<p style="color:#94a3b8; font-size:14px; line-height:1.8; margin-top:28px;">
<a href="${siteUrl}" style="color:#22d3ee; text-decoration:none;">Acessar plataforma</a>
&nbsp;•&nbsp;
<a href="${comprasUrl}" style="color:#22d3ee; text-decoration:none;">Ver compras</a>
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