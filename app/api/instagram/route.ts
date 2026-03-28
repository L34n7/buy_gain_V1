import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || "";
const ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN?.trim() || "";
const INSTAGRAM_IG_ID = process.env.INSTAGRAM_IG_ID?.trim() || "";

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
          const igId = INSTAGRAM_IG_ID || entry?.id || event?.recipient?.id;

          await sendInstagramMessage({
            igId,
            recipientId: senderId,
            message: "Seu código é: BG-A7K92",
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}

async function sendInstagramMessage({
  igId,
  recipientId,
  message,
}: {
  igId: string;
  recipientId: string;
  message: string;
}) {
  if (!ACCESS_TOKEN) {
    throw new Error("INSTAGRAM_TOKEN não configurado");
  }

  if (!igId) {
    throw new Error("IG ID não encontrado");
  }

  const url = `https://graph.instagram.com/v25.0/${igId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });

  const data = await response.json();

  console.log("IG ID usado:", igId);
  console.log("Status envio:", response.status);
  console.log("Resposta envio:", data);

  if (!response.ok) {
    throw new Error(
      `Falha ao enviar mensagem: ${JSON.stringify(data)}`
    );
  }

  return data;
}