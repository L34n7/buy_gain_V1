import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    /*
    console.log("RESEND_API_KEY existe?", !!process.env.RESEND_API_KEY);
    console.log("EMAIL_FROM:", process.env.EMAIL_FROM_RESEND);
    console.log("Enviando com Resend para:", to);
    console.log("Assunto:", subject);*/

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM_RESEND!,
      to,
      subject,
      html,
    });

    console.log("Resend response:", response);
    return response;
  } catch (error) {
    console.error("Erro ao enviar email com Resend:", error);
    throw error;
  }
}