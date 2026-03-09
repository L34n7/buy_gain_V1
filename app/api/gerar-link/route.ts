import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createUserSupabase } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  let authUserId: string | null = null;
  let internalUserId: string | null = null;

  try {
    const body = await req.json();
    productUrl = body.productUrl;

    const supabaseUser = await createUserSupabase();

    if (!productUrl) {
      await registrarErroLink(
        supabaseAdmin,
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
        supabaseAdmin,
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

    authUserId = user.id;

    /* -----------------------------------------------------
       Resolve o ID real da tabela users
       users.auth_user_id = auth.users.id
    ----------------------------------------------------- */
    const { data: userInterno, error: userInternoError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (userInternoError || !userInterno?.id) {
      await registrarErroLink(
        supabaseAdmin,
        authUserId,
        productUrl,
        "Usuário interno não encontrado na tabela users",
        "mercadolivre"
      );

      return NextResponse.json(
        { error: "Usuário interno não encontrado" },
        { status: 400 }
      );
    }

    /* -----------------------------------------------
       1️⃣ VERIFICA CACHE (3 HORAS)
       Busca EXATAMENTE pelo link colado
    ----------------------------------------------- */
    const tresHorasAtras = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();

    const { data: cache, error: cacheError } = await supabaseAdmin
      .from("generate_link")
      .select("*")
      .eq("user_id", internalUserId)
      .eq("produto_url", productUrl)
      .gte("data_criacao", tresHorasAtras)
      .order("data_criacao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cache?.link_rastreado) {
      console.log("⚡ Cache encontrado - retornando sem chamar automação");

      return NextResponse.json({
        link_rastreado: cache.link_rastreado,
        produto_nome: cache.produto_nome,
        produto_imagem: cache.produto_imagem,
        valor: cache.valor,
        ganhos: cache.ganhos,
        ganho_estimado: cache.ganho_estimado,
        pontos: cache.pontos,
        perfil_aut: cache.perfil_aut,
        bonus_percent: cache.bonus_percent,
        bonus_source: cache.bonus_source,
        produto_url: cache.produto_url,
        plataforma: cache.plataforma,
        marketplace_id: cache.marketplace_id,
        cached: true,
      });
    }

    /* -----------------------------------------------
       2️⃣ OPEN GRAPH (fallback)
    ----------------------------------------------- */
    const ogData = await extractOpenGraph(productUrl);

    /* -----------------------------------------------
       3️⃣ CHAMA AUTOMAÇÃO
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
        supabaseAdmin,
        internalUserId,
        productUrl,
        "Erro automação ML: " + res.status,
        "mercadolivre"
      );

      throw new Error(
        "TENTE NOVAMENTE POR FAVOR (Erro automação: " + res.status + ")"
      );
    }

    console.log("Automação respondeu");

    const data = await res.json();

    /* -----------------------------------------------
       4️⃣ Fallback final
    ----------------------------------------------- */
    const imagemFinal =
      data.produto_imagem ?? ogData.produto_imagem ?? null;

    const nomeFinal =
      data.produto_nome ?? ogData.produto_nome ?? null;

    /* -----------------------------------------------
       5️⃣ SALVA CACHE
       Usa client ADMIN para não bater em RLS
    ----------------------------------------------- */
    try {
      const payloadInsert = {
        user_id: internalUserId,
        produto_nome: nomeFinal,
        produto_url: productUrl,
        link_rastreado: data.link_rastreado ?? null,
        valor: data.valor ?? null,
        ganhos: data.ganhos ?? null,
        ganho_estimado: data.ganho_estimado ?? null,
        pontos: data.pontos ?? null,
        perfil_aut: data.perfil_aut ?? null,
        produto_imagem: imagemFinal,
        bonus_percent: data.bonus_percent ?? null,
        bonus_source: data.bonus_source ?? null,
        plataforma: "mercadolivre",
        marketplace_id: data.marketplace_id ?? null,
      };

      const { error: insertError } = await supabaseAdmin
        .from("generate_link")
        .insert(payloadInsert);

      if (insertError) {
        console.error("Erro ao salvar cache:", insertError);
      } else {
        console.log("Cache salvo com sucesso");
      }
    } catch (e) {
      console.error("Erro ao salvar cache:", e);
    }

    /* -----------------------------------------------
       6️⃣ RETORNO FINAL
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
      await registrarErroLink(
        supabaseAdmin,
        internalUserId ?? authUserId,
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
