import { NextResponse } from "next/server";
import { createAdminSupabase, createUserSupabase } from "@/lib/supabaseServer";

/* -----------------------------------------------------
   EXTRAI OPEN GRAPH (preview social)
----------------------------------------------------- */
async function extractOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1",
        Accept: "text/html",
      },
    });

    const html = await res.text();

    console.log("----- TESTE OPEN GRAPH -----");
console.log("Status:", res.status);
console.log("HTML length:", html.length);
console.log("Tem og:image?", html.includes("og:image"));
console.log("Primeiros 500 chars:", html.slice(0, 500));
console.log("----- FIM TESTE -----");

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
      produto_imagem: ogImage?.startsWith("//") ? "https:" + ogImage : ogImage,
      produto_nome: ogTitle,
      produto_descricao: ogDescription,
    };
  } catch (err) {
    console.error("Erro ao extrair Open Graph:", err);
    return {
      produto_imagem: null,
      produto_nome: null,
      produto_descricao: null,
    };
  }
}

export async function POST(req: Request) {
  try {
    const { productUrl, platform } = await req.json();

    if (!productUrl) {
      return NextResponse.json(
        { error: "URL não informada" },
        { status: 400 }
      );
    }

    const admin = await createAdminSupabase();

    /* 🔐 PEGAR USUÁRIO LOGADO */
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    /* -----------------------------------------------
       2️⃣ CACHE – últimos 6h
    ----------------------------------------------- */
    const SIX_HOURS_AGO = new Date(
      Date.now() - 6 * 60 * 60 * 1000
    ).toISOString();

    const { data: registros, error } = await admin
      .from("generate_link")
      .select("*")
      .eq("produto_url", productUrl)
      .gte("data_criacao", SIX_HOURS_AGO)
      .order("data_criacao", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erro cache generate_link:", error);
      return NextResponse.json(
        { error: "Erro ao consultar link existente" },
        { status: 500 }
      );
    }

    if (registros && registros.length > 0) {
      const r = registros[0];

      const ganho_min = r.ganho_estimado * 0.1;
      const ganho_max = r.ganho_estimado * 0.3;

      return NextResponse.json({
        ...r,
        ganho_min,
        ganho_max,
        fromCache: true,
      });
    }

    /* -----------------------------------------------
       3️⃣ OPEN GRAPH
    ----------------------------------------------- */
    const ogData = await extractOpenGraph(productUrl);

    /* -----------------------------------------------
       4️⃣ CHAMA AUTOMAÇÃO
    ----------------------------------------------- */
const res = await fetch(
  "https://unonerous-subglacially-ryan.ngrok-free.dev/executar",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productUrl,
    }),
  }
);

    if (!res.ok) {
      throw new Error("Erro ao chamar automação");
    }

    const data = await res.json();

    /* -----------------------------------------------
   SALVAR NO BANCO (IMAGEM + NOME)
----------------------------------------------- */

const imagemFinal = data.produto_imagem ?? ogData.produto_imagem;
const nomeFinal = data.produto_nome ?? ogData.produto_nome;

const { error: insertError } = await admin
  .from("generate_link")
  .insert({
    produto_url: productUrl,
    link_rastreado: data.link_rastreado,
    ganho_estimado: data.ganho_estimado,
    produto_nome: nomeFinal,
    produto_imagem: imagemFinal,
  });

if (insertError) {
  console.error("Erro ao salvar generate_link:", insertError);
}

    /* -----------------------------------------------
       5️⃣ 🔥 VERIFICAR CONQUISTAS (NOVO)
    ----------------------------------------------- */
    let conquistas = null;

    if (user) {
      const { data: conquistasData } = await admin.rpc(
        "verificar_conquistas_usuario",
        { p_auth_user_id: user.id }
      );

      conquistas = conquistasData;
    }

    /* -----------------------------------------------
       6️⃣ RETORNO FINAL
    ----------------------------------------------- */
    return NextResponse.json({
      ...data,

      produto_imagem: imagemFinal,      
      produto_nome: data.produto_nome ?? ogData.produto_nome,
      produto_descricao: ogData.produto_descricao,

      fromCache: false,

      // 🔥 retorna conquistas se houver
      ...(conquistas || {}),
    });

  } catch (err: any) {
    console.error("Erro /api/gerar-link:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}