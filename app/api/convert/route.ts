/* CHAMA AUTOMACAO LINK AUT VIA NGROK */

import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<Response> {
  try {
    const { productUrl, platform } = await req.json();

    if (!productUrl) {
      return NextResponse.json(
        { error: "URL não informada" },
        { status: 400 }
      );
    }

    if (platform !== "mercadolivre") {
      return NextResponse.json(
        { error: "Plataforma não suportada" },
        { status: 400 }
      );
    }

    // 🔥 CHAMA SEU NOTEBOOK VIA NGROK
    const response = await fetch(
      "https://unonerous-subglacially-ryan.ngrok-free.dev/executar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productUrl }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.erro || "Erro na automação" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}