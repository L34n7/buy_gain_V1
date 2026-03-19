export function welcomeEmailTemplate(nome: string) {
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
              border:1px solid #7c3aed;
              overflow:hidden;">

<!-- HEADER -->
<tr>
<td align="center" style="padding:40px 30px 20px 30px;">

<img src="https://buygain.com.br/logo.png"
     alt="BuyGain"
     width="160"
     style="display:block; margin-bottom:20px;" />

<h1 style="color:#ffffff; margin:0; font-size:24px;">
Bem-vindo à BuyGain 🚀
</h1>

<p style="color:#a78bfa; margin-top:8px; font-size:14px;">
Sua jornada começou!
</p>

</td>
</tr>

<!-- CONTEÚDO -->
<tr>
<td style="padding:40px 35px;">

<h2 style="color:#ffffff; font-size:20px; margin-top:0;">
Olá, ${nome}! 🎮
</h2>

<p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
Sua conta foi confirmada com sucesso.
Agora você faz parte da plataforma de recompensas mais estratégica da internet.
</p>

<div style="background-color:#0b1220;
            border:1px solid #06b6d4;
            padding:20px;
            border-radius:14px;
            margin:30px 0;
            text-align:center;">

<span style="color:#22d3ee; font-size:16px; font-weight:bold;">
🔥 Próximo passo:
</span>

<p style="color:#a78bfa; font-size:15px; margin:10px 0 0 0;">
Cole seu primeiro link e comece a acumular XP
</p>

</div>

<div style="text-align:center; margin:35px 0;">

<a href="https://buygain.com.br/dashboard"
style="display:inline-block;
       padding:16px 32px;
       background-color:#7c3aed;
       color:#ffffff;
       font-weight:bold;
       font-size:15px;
       text-decoration:none;
       border-radius:14px;">
Ir para o Painel
</a>

</div>

<p style="color:#64748b; font-size:13px;">
Dica: quanto mais você usa a plataforma, mais recompensas desbloqueia.
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