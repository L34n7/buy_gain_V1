import { NextResponse } from "next/server";
import { createUserSupabase } from "@/lib/supabaseServer";

/* -----------------------------------------------------
   EXTRAI OPEN GRAPH (fallback nome/imagem)
----------------------------------------------------- */
async function extractOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    const html = await res.text();

    const ogImage =
      html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      null;

    const ogTitle =
      html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<title>(.*?)<\/title>/i)?.[1] ||
      null;

    const ogDescription =
      html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      null;

    return {
      produto_imagem: ogImage?.startsWith("//")
        ? "https:" + ogImage
        : ogImage,
      produto_nome: ogTitle,
      produto_descricao: ogDescription,
    };
  } catch {
    return {
      produto_imagem: null,
      produto_nome: null,
      produto_descricao: null,
    };
  }
}

export async function POST(req: Request) {
  try {
    const { productUrl } = await req.json();

    if (!productUrl) {
      return NextResponse.json(
        { error: "URL não informada" },
        { status: 400 }
      );
    }

    /* 🔐 Usuário autenticado */
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    /* -----------------------------------------------
       1️⃣ OPEN GRAPH (fallback)
    ----------------------------------------------- */
    const ogData = await extractOpenGraph(productUrl);

    /* -----------------------------------------------
       2️⃣ CHAMA AUTOMAÇÃO (ngrok)
    ----------------------------------------------- */
    console.log("Chamando automação...");
    const res = await fetch(
      "https://unonerous-subglacially-ryan.ngrok-free.dev/executar",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl }),
      }
    );

if (!res.ok) {
  const erroTexto = await res.text();

  console.error("Status automação:", res.status);
  console.error("Resposta automação:", erroTexto);

  throw new Error("Erro automação: " + res.status);
}

    console.log("Automação respondeu");
    const data = await res.json();

    /* -----------------------------------------------
       3️⃣ Fallback final
    ----------------------------------------------- */
    const imagemFinal =
      data.produto_imagem ?? ogData.produto_imagem ?? null;

    const nomeFinal =
      data.produto_nome ?? ogData.produto_nome ?? null;

    /* -----------------------------------------------
       4️⃣ RETORNO FINAL
    ----------------------------------------------- */
    return NextResponse.json({
      ...data,
      produto_imagem: imagemFinal,
      produto_nome: nomeFinal,
      produto_descricao: ogData.produto_descricao ?? null,
    });

  } catch (err: any) {
    console.error("Erro /api/gerar-link:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}