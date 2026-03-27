import { sendEmail } from "@/lib/email/sendEmail";
import { getResgateProcessadoEmailTemplate } from "./templates/resgateProcessadoEmail";

type SendResgateProcessadoEmailParams = {
  to: string;
  userName: string;
  resgateId: string;
  giftcardNome: string;
  opcaoLabel: string;
  giftcardImageUrl?: string;
};

export async function sendResgateProcessadoEmail({
  to,
  userName,
  resgateId,
  giftcardNome,
  opcaoLabel,
  giftcardImageUrl,
}: SendResgateProcessadoEmailParams) {
  const subject = "Sua recompensa já está disponível 🎁 | BuyGain";

  const siteUrl = "https://buygain.com.br/auth/login";
  const inventarioUrl = "https://buygain.com.br/dashboard/inventario";
  const suporteUrl = "https://buygain.com.br/dashboard/ajuda";

  const html = getResgateProcessadoEmailTemplate({
    userName,
    resgateId,
    giftcardNome,
    opcaoLabel,
    giftcardImageUrl,
    inventarioUrl,
    siteUrl,
    suporteUrl,
  });

  const text = `
Olá, ${userName}!

Seu resgate foi processado com sucesso pela BuyGain.

Resumo:
- Número do resgate: #${resgateId}
- Recompensa: ${giftcardNome}
- Opção selecionada: ${opcaoLabel}
- Status atual: CONCLUIDO

Acesse seu inventário para visualizar o código do gift card:
${inventarioUrl}

Acesse a plataforma:
${siteUrl}

Suporte:
${suporteUrl}

Atenciosamente,
Equipe BuyGain
  `;

await sendEmail({
  to,
  subject,
  html,
});
}