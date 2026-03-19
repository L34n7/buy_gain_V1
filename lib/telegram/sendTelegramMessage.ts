export async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_CHAMADOS_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAMADOS_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram de chamados não configurado no .env.local");
    return { ok: false, error: "Variáveis do Telegram não configuradas." };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao enviar mensagem para o Telegram:", data);
      return { ok: false, error: data };
    }

    return { ok: true, data };
  } catch (error) {
    console.error("Erro interno ao enviar Telegram:", error);
    return { ok: false, error };
  }
}