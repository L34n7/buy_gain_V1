import { transporter } from "./transporter";
import { getResgateRewardEmailTemplate } from "./templates/resgateRewardEmail";

type SendResgateEmailParams = {
  to: string;
  userName: string;
  resgateId: string;
  giftcardNome: string;
  opcaoLabel: string;
  pontosUsados: number;
  saldoRestante: number;
  prazoEntrega: string;
};

export async function sendResgateEmail({
  to,
  userName,
  resgateId,
  giftcardNome,
  opcaoLabel,
  pontosUsados,
  saldoRestante,
  prazoEntrega,
}: SendResgateEmailParams) {
  const subject = "Seu resgate foi confirmado 🎉 | BuyGain";

  const html = getResgateRewardEmailTemplate({
    userName,
    resgateId,
    giftcardNome,
    opcaoLabel,
    pontosUsados,
    saldoRestante,
    prazoEntrega,
  });

  const text = `
Olá, ${userName}!

Recebemos com sucesso o seu pedido de resgate na BuyGain.

Resumo do resgate:
- Número do resgate: #${resgateId}
- Recompensa: ${giftcardNome}
- Opção selecionada: ${opcaoLabel}
- Pontos utilizados: ${pontosUsados}
- Saldo restante: ${saldoRestante}
- Status atual: PENDENTE
- Prazo para recebimento do código: ${prazoEntrega}

Atenciosamente,
Equipe BuyGain
  `;

  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "BuyGain"}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  return info;
}