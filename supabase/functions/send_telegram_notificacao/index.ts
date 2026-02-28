import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function formatDateBR(isoDate: string) {
  return new Date(isoDate).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  });
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: notificacoes } = await supabase
    .from("ml_notificacao")
    .select("*")
    .eq("status", "PENDENTE")
    .eq("canal", "TELEGRAM")
    .limit(10);

  for (const n of notificacoes ?? []) {
    try {
      const dataBR = formatDateBR(n.created_at);

      const msg = `
🚨 *ANÁLISE MANUAL NECESSÁRIA*

🆔 *Evento:* ${n.evento_id}
👤 *Usuário:* ${n.user_id}
🔗 *Link rastreado:*
${n.link_rastreado}

🕒 *Data (BR):* ${dataBR}

📌 *Origem:* ${n.payload?.origem ?? '-'}
📝 *Observação:*
${n.payload?.observacao ?? '—'}
      `;

      const resp = await fetch(
        `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: Deno.env.get("TELEGRAM_CHAT_ID"),
            text: msg,
            parse_mode: "Markdown"
          })
        }
      );

      if (!resp.ok) throw new Error("Falha ao enviar Telegram");

      await supabase
        .from("ml_notificacao")
        .update({
          status: "ENVIADO",
          sent_at: new Date().toISOString()
        })
        .eq("id", n.id);

    } catch (err) {
      await supabase
        .from("ml_notificacao")
        .update({
          status: "ERRO",
          erro: String(err)
        })
        .eq("id", n.id);
    }
  }

  return new Response("OK");
});