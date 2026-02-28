import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 * - trim
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    /* -----------------------------------------------
       1️⃣ INPUT
    ----------------------------------------------- */
    const { link_rastreado } = await req.json();

    if (!link_rastreado) {
      return NextResponse.json(
        { error: "link_rastreado não informado" },
        { status: 400 }
      );
    }

    // 🔐 Supabase ADMIN (service role)
    const admin = await createAdminSupabase();

    /* -----------------------------------------------
       2️⃣ CATEGORIAS DO PRODUTO
    ----------------------------------------------- */
    const { data: categorias, error: catErr } = await admin
      .from("categoria_ml")
      .select("categoria, nivel")
      .eq("link_rastreado", link_rastreado)
      .order("nivel", { ascending: false });

    if (catErr) {
      console.error("Erro categorias produto:", catErr);
      throw catErr;
    }

    if (!categorias || categorias.length === 0) {
      return NextResponse.json([]);
    }

    /* -----------------------------------------------
       2️⃣.1 SINÔNIMOS
    ----------------------------------------------- */
    const { data: sinonimos, error: sinErr } = await admin
      .from("categoria_sinonimo")
      .select("categoria_base, sinonimo");

    if (sinErr) {
      console.error("Erro categoria_sinonimo:", sinErr);
      throw sinErr;
    }

    /* -----------------------------------------------
       3️⃣ CUPONS ATIVOS (MERCADO LIVRE)
    ----------------------------------------------- */
    const hoje = new Date().toISOString().split("T")[0];

    const { data: cupons, error: cupErr } = await admin
      .from("cupom")
      .select(`
        id_cupom,
        cupom,
        categoria,
        descricao,
        regras,
        valor,
        score_confiabilidade,
        desconto_maximo,
        vezes_click
      `)
      .eq("ativo", true)
      .eq("loja", "Mercado Livre")
      .or(`data_fim.is.null,data_fim.gte.${hoje}`);

    if (cupErr) {
      console.error("Erro cupons:", cupErr);
      throw cupErr;
    }

    if (!cupons || cupons.length === 0) {
      return NextResponse.json([]);
    }

    /* -----------------------------------------------
       4️⃣ MATCH DE CATEGORIAS (COM SINÔNIMOS)
    ----------------------------------------------- */
    const resultado: any[] = [];

    for (const cupom of cupons) {
      let melhorNivel = 0;
      let categoriaMatch: string | null = null;

      const categoriaCupomNorm = normalize(cupom.categoria);

      for (const cat of categorias) {
        const categoriaProdutoNorm = normalize(cat.categoria);

        const sinonimoEncontrado = sinonimos?.find((s) =>
          categoriaProdutoNorm.includes(normalize(s.sinonimo))
        );

        if (!sinonimoEncontrado) continue;

        const categoriaBase = normalize(sinonimoEncontrado.categoria_base);

        if (categoriaCupomNorm === categoriaBase) {
          if (cat.nivel > melhorNivel) {
            melhorNivel = cat.nivel;
            categoriaMatch = cat.categoria;
          }
        }
      }

      // Cupom geral
      if (categoriaCupomNorm === "geral") {
        resultado.push({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: "Geral",
          score_match: melhorNivel,
          score_confiabilidade: cupom.score_confiabilidade,
          regras: cupom.regras,
          descricao: cupom.descricao,
          valor: cupom.valor,
          vezes_click: cupom.vezes_click,
        });
        continue;
      }

      if (melhorNivel > 0) {
        resultado.push({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: categoriaMatch,
          score_match: melhorNivel,
          score_confiabilidade: cupom.score_confiabilidade,
          regras: cupom.regras,
          descricao: cupom.descricao,
          valor: cupom.valor,
          vezes_click: cupom.vezes_click,
        });
      }
    }

    /* -----------------------------------------------
       5️⃣ ORDENAÇÃO FINAL
    ----------------------------------------------- */
    resultado.sort((a, b) => {
      if (b.score_match !== a.score_match) {
        return b.score_match - a.score_match;
      }
      if (b.desconto_maximo !== a.desconto_maximo) {
        return b.desconto_maximo - a.desconto_maximo;
      }
      return (b.score_confiabilidade || 0) - (a.score_confiabilidade || 0);
    });

    /* -----------------------------------------------
       6️⃣ RETORNO
    ----------------------------------------------- */
    return NextResponse.json(resultado);

  } catch (err: any) {
    console.error("Erro /api/cupom/match:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}
