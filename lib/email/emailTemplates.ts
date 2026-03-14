export function getCompraEmAnaliseEmail({
  nome,
  produtoNome,
  produtoImagem,
  dataEvento,
}: {
  nome: string;
  produtoNome?: string | null;
  produtoImagem?: string | null;
  dataEvento?: string | null;
}) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
  </head>
  <body bgcolor="#070b14" style="margin:0; padding:0; background-color:#070b14 !important; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#070b14" style="background-color:#070b14 !important; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" bgcolor="#0f172a"
          style="background-color:#0f172a !important; border-radius:20px; border:1px solid #06b6d4; overflow:hidden;">

          <tr>
            <td align="center" style="padding:40px 30px 20px 30px;">
              <img src="https://buygain.com.br/logo.png"
                  alt="BuyGain"
                  width="180"
                  style="display:block; margin:0 auto 20px auto; height:auto;" />

              <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
                Sua compra entrou em análise 👀
              </h1>

              <p style="color:#22d3ee; margin-top:8px; font-size:14px;">
                Detectamos um novo evento da sua compra
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 35px;">

              <h2 style="color:#ffffff; font-size:20px; margin-top:0;">
                Olá, ${nome || "usuário"}!
              </h2>

              <p style="color:#cbd5e1; font-size:16px; line-height:1.6;">
                Sua compra foi identificada no sistema da BuyGain e está em análise.
                Normalmente os eventos aparecem em até 24 horas após a compra.
              </p>

              <div style="background-color:#0b1220; border:1px solid #7c3aed; padding:20px; border-radius:14px; margin:30px 0;">
                <p style="color:#a78bfa; font-size:14px; margin:0 0 10px 0;">
                  Produto identificado
                </p>

                <p style="color:#ffffff; font-size:16px; margin:0; font-weight:bold;">
                  ${produtoNome || "Compra identificada"}
                </p>

                ${
                  dataEvento
                    ? `
                    <p style="color:#94a3b8; font-size:13px; margin:10px 0 0 0;">
                      Data do evento: ${new Date(dataEvento).toLocaleString("pt-BR")}
                    </p>
                  `
                    : ""
                }
              </div>

              ${
                produtoImagem
                  ? `
                    <div style="text-align:center; margin:25px 0;">
                      <img src="${produtoImagem}"
                          alt="${produtoNome || "Produto"}"
                          width="140"
                          style="max-width:140px; border-radius:12px;" />
                    </div>
                  `
                  : ""
              }

              <div style="text-align:center; margin:35px 0;">
                <a href="https://buygain.com.br/dashboard/compras"
                  style="display:inline-block; padding:16px 32px; background-color:#06b6d4; color:#ffffff; font-weight:bold; font-size:15px; text-decoration:none; border-radius:14px;">
                  Acompanhar Minha Compra
                </a>
              </div>

              <p style="color:#64748b; font-size:13px; margin-top:25px;">
                Este é um aviso automático da BuyGain.
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" bgcolor="#0b1220"
                style="background-color:#0b1220 !important; padding:25px; font-size:12px; color:#6b7280;">
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