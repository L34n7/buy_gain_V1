import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || "";
const ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN?.trim() || "";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge || "ok", { status: 200 });
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Webhook recebido:", JSON.stringify(body, null, 2));

    const entries = body.entry || [];

    for (const entry of entries) {
      const messaging = entry.messaging || [];

      for (const event of messaging) {
        const senderId = event?.sender?.id;
        const text = event?.message?.text?.toLowerCase()?.trim();

        if (!senderId || !text) continue;

        if (text.includes("codigo") || text.includes("código")) {
          await debugAccessToken();
          await sendMessage(senderId, "Seu código é: BG-A7K92");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}

async function debugAccessToken() {
  const token = ACCESS_TOKEN;

  console.log("Token existe?", !!token);
  console.log("Tamanho token:", token.length);
  console.log("Prefixo token:", token.slice(0, 10));
  console.log("Sufixo token:", token.slice(-6));

  const meUrl = `https://graph.facebook.com/v25.0/me?access_token=${encodeURIComponent(token)}`;

  const meResponse = await fetch(meUrl, { method: "GET" });
  const meData = await meResponse.json();

  console.log("Status /me:", meResponse.status);
  console.log("Resposta /me:", meData);
}

async function sendMessage(recipientId: string, message: string) {
  const token = ACCESS_TOKEN;

  const url = `https://graph.facebook.com/v25.0/me/messages?access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });

  const data = await response.json();

  console.log("Status envio:", response.status);
  console.log("Resposta envio:", data);
}