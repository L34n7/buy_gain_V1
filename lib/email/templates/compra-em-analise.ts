type CompraEmAnaliseTemplateParams = {
  nome?: string | null;
  produtoNome?: string | null;
  produtoImagem?: string | null;
  origem?: string | null;
};

export function compraEmAnaliseTemplate({
  nome,
  produtoNome,
  produtoImagem,
  origem,
}: CompraEmAnaliseTemplateParams) {
  const nomeUsuario = nome?.trim() || "cliente";
  const nomeProduto = produtoNome?.trim() || "Sua compra";
  const loja = origem?.trim() || "parceiro";
  const siteUrl = process.env.SITE_URL || "https://buygain.com.br";

  return `
    <div style="margin:0; padding:0; background:#0b1020; font-family:Arial, Helvetica, sans-serif; color:#ffffff;">
      <div style="max-width:600px; margin:0 auto; padding:24px;">
        <div style="background:#11182d; border:1px solid #24304d; border-radius:18px; overflow:hidden;">
          
          <div style="padding:24px; text-align:center; background:linear-gradient(135deg,#18c29c,#2dd4bf);">
            <h1 style="margin:0; font-size:26px; color:#08111f;">
              Compra identificada
            </h1>
          </div>

          <div style="padding:24px;">
            <p style="font-size:16px; line-height:1.6; margin-top:0;">
              Olá, <strong>${nomeUsuario}</strong>!
            </p>

            <p style="font-size:15px; line-height:1.7; color:#dbe4ff;">
              Identificamos uma nova compra vinculada à sua conta no sistema do <strong>Compre e Ganhe</strong>.
            </p>

            <div style="background:#0c1324; border:1px solid #24304d; border-radius:14px; padding:16px; margin:20px 0;">
              <p style="margin:0 0 8px 0; font-size:15px;">
                <strong>Loja:</strong> ${loja}
              </p>
              <p style="margin:0; font-size:15px;">
                <strong>Produto:</strong> ${nomeProduto}
              </p>
            </div>

            ${
              produtoImagem
                ? `
                <div style="text-align:center; margin:20px 0;">
                  <img 
                    src="${produtoImagem}" 
                    alt="Produto"
                    style="max-width:180px; width:100%; height:auto; border-radius:14px; border:1px solid #24304d;"
                  />
                </div>
              `
                : ""
            }

            <p style="font-size:15px; line-height:1.7; color:#dbe4ff;">
              Agora a compra ficará visível no seu painel e seguirá o fluxo normal de acompanhamento até as próximas atualizações.
            </p>

            <div style="text-align:center; margin:28px 0 12px 0;">
              <a 
                href="${siteUrl}/dashboard/compras"
                style="display:inline-block; padding:14px 22px; border-radius:12px; background:#2dd4bf; color:#08111f; text-decoration:none; font-weight:bold;"
              >
                Ver minhas compras
              </a>
            </div>

            <p style="font-size:13px; line-height:1.6; color:#98a5c3; margin-top:24px;">
              Este é um e-mail automático enviado apenas para informar que sua compra entrou no sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}