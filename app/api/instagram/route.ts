import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || "";
const ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN?.trim() || "";
const INSTAGRAM_IG_ID = process.env.INSTAGRAM_IG_ID?.trim() || "";

// anti-spam simples em memória
const userCooldown = new Map<string, number>();
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutos

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
        const senderId = event?.sender?.id as string | undefined;
        const text = event?.message?.text?.toLowerCase()?.trim();

        if (!senderId || !text) continue;

        if (text.includes("codigo") || text.includes("código")) {
          const now = Date.now();
          const lastSent = userCooldown.get(senderId) || 0;

          if (now - lastSent < COOLDOWN_MS) {
            console.log("Cooldown ativo para:", senderId);
            continue;
          }

          userCooldown.set(senderId, now);

          const igId = INSTAGRAM_IG_ID || entry?.id || event?.recipient?.id;

          if (!igId) {
            console.error("IG ID não encontrado");
            continue;
          }

          const username = await getInstagramUsername(senderId);
          const displayName = formatDisplayName(username);

          await sendTypingOn(senderId);
          await sleep(1500);

          await sendInstagramMessage({
            igId,
            recipientId: senderId,
            message: `> analisando permissão...`,
          });

          await sendTypingOn(senderId);
          await sleep(1800);

          await sendInstagramMessage({
            igId,
            recipientId: senderId,
            message: `>👤 ${displayName}

            > acesso autorizado...`,
          });

          await sendTypingOn(senderId);
          await sleep(2200);

          await sendInstagramMessage({
            igId,
            recipientId: senderId,
            message: `🧠 CÓDIGO SECRETO CAPTURADO


🔑 BG-A7K92


Insira esse código no sistema e receba:

• 150 Pontos
• 150 XP

⚠️ Continue acompanhando nosso Instagram:
vem novidade por aí, bônus especiais e sorteios mensais 👀🔥`,
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

async function getInstagramUsername(userId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v25.0/${userId}?fields=username`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    console.log("Status username:", response.status);
    console.log("Resposta username:", data);

    if (!response.ok) {
      return null;
    }

    return typeof data?.username === "string" ? data.username : null;
  } catch (error) {
    console.error("Erro ao buscar username:", error);
    return null;
  }
}

function formatDisplayName(username: string | null): string {
  if (!username) return "Jogador";

  const clean = username
    .replace(/[._]+/g, " ")
    .trim()
    .slice(0, 30);

  if (!clean) return "Jogador";

  return clean;
}

async function sendTypingOn(recipientId: string) {
  const response = await fetch(`https://graph.instagram.com/v25.0/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: "typing_on",
    }),
  });

  const data = await response.json();
  console.log("Typing status:", response.status);
  console.log("Typing response:", data);
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
  const response = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
      }),
    }
  );

  const data = await response.json();

  console.log("Status envio:", response.status);
  console.log("Resposta envio:", data);

  if (!response.ok) {
    throw new Error(`Falha ao enviar mensagem: ${JSON.stringify(data)}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}