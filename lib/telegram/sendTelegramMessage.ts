type TelegramConfig = {
  botToken: string;
  chatId: string;
};

export async function sendTelegramMessage(
  text: string,
  config: TelegramConfig
) {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    console.warn("⚠️ Telegram não configurado corretamente.");
    return {
      ok: false,
      error: "Variáveis do Telegram não configuradas.",
    };
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
      console.error("❌ Erro ao enviar mensagem para o Telegram:", data);
      return { ok: false, error: data };
    }

    return { ok: true, data };
  } catch (error) {
    console.error("❌ Erro interno ao enviar Telegram:", error);
    return { ok: false, error };
  }
}