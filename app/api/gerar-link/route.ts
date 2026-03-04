import { NextResponse } from "next/server";
import { createUserSupabase } from "@/lib/supabaseServer";

async function registrarErroLink(
  supabase: any,
  userId: string | null,
  url: string,
  erro: string,
  plataforma: string
) {
  try {
    await supabase.from("links_erro").insert({
      user_id: userId ?? null,
      url: url,
      erro: erro,
      plataforma: plataforma,
      data: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Erro ao registrar log:", e);
  }
}

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

  let productUrl: string | null = null;
  let userId: string | null = null;

  try {
    const body = await req.json();
    productUrl = body.productUrl;

    const supabaseUser = await createUserSupabase();

    if (!productUrl) {

      await registrarErroLink(
        supabaseUser,
        null,
        "desconhecida",
        "URL não informada",
        "mercadolivre"
      );

      return NextResponse.json(
        { error: "URL não informada" },
        { status: 400 }
      );
    }

    /* 🔐 Usuário autenticado */
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {

      await registrarErroLink(
        supabaseUser,
        null,
        productUrl,
        "Usuário não autenticado",
        "mercadolivre"
      );

      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    userId = user.id;

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

      await registrarErroLink(
        supabaseUser,
        userId,
        productUrl,
        "Erro automação ML: " + res.status,
        "mercadolivre"
      );

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

    try {

      const supabaseUser = await createUserSupabase();

      await registrarErroLink(
        supabaseUser,
        userId,
        productUrl ?? "desconhecida",
        err?.message || "Erro inesperado",
        "mercadolivre"
      );

    } catch {}

    return NextResponse.json(
      { error: err.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}