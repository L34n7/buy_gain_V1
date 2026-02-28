import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

/* -----------------------------------------
   Normalizador (igual ML)
------------------------------------------ */
function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { link_rastreado } = await req.json();

    if (!link_rastreado) {
      return NextResponse.json(
        { error: "link_rastreado é obrigatório" },
        { status: 400 }
      );
    }

    const admin = await createAdminSupabase();
    const hoje = new Date().toISOString().split("T")[0];

    /* =====================================================
       1️⃣ Buscar generate_link (pega valor do produto)
    ===================================================== */
    const { data: linkData, error: linkErr } = await admin
      .from("generate_link")
      .select("id, valor")
      .eq("link_rastreado", link_rastreado)
      .single();

    if (linkErr || !linkData) {
      return NextResponse.json(
        { error: "Link não encontrado" },
        { status: 404 }
      );
    }

    const valorProduto = Number(linkData.valor || 0);

    /* =====================================================
       2️⃣ Buscar categorias do produto
    ===================================================== */
    const { data: categoriasEvento, error: catErr } = await admin
      .from("categoria_shopee")
      .select("categoria_id, nivel")
      .eq("generate_link_id", linkData.id)
      .order("nivel", { ascending: false });

    if (catErr) throw catErr;

    if (!categoriasEvento || categoriasEvento.length === 0) {
      return NextResponse.json([]);
    }

    const categoriaIds = categoriasEvento.map(c => c.categoria_id);

    /* =====================================================
       3️⃣ Buscar nomes oficiais
    ===================================================== */
    const { data: categoriasBase } = await admin
      .from("categoria_shopee_base")
      .select("id, nome")
      .in("id", categoriaIds);

    if (!categoriasBase || categoriasBase.length === 0) {
      return NextResponse.json([]);
    }

    const categoriasProduto = categoriasEvento
      .map(cat => {
        const base = categoriasBase.find(b => b.id === cat.categoria_id);
        return base
          ? { nome: base.nome, nivel: cat.nivel }
          : null;
      })
      .filter(Boolean) as { nome: string; nivel: number }[];

    /* =====================================================
       4️⃣ Buscar sinônimos
    ===================================================== */
    const { data: sinonimos } = await admin
      .from("categoria_sinonimo")
      .select("categoria_base, sinonimo");

    const sinonimosNorm = (sinonimos || []).map(s => ({
      categoria_base: normalize(s.categoria_base),
      sinonimo: normalize(s.sinonimo),
    }));

    /* =====================================================
       5️⃣ Buscar cupons ATIVOS da SHOPEE
    ===================================================== */
    const { data: cupons, error: cupErr } = await admin
      .from("cupom")
      .select(`
        id_cupom,
        cupom,
        categoria,
        descricao,
        regras,
        valor,
        desconto_maximo,
        score_confiabilidade,
        vezes_click,
        valor_minimo_compra,
        loja,
        data_inicio,
        data_fim
      `)
      .eq("ativo", true)
      .eq("loja", "Shopee") // 🔥 FILTRO CORRETO
      .or(`data_fim.is.null,data_fim.gte.${hoje}`);

    if (cupErr) throw cupErr;
    if (!cupons || cupons.length === 0) {
      return NextResponse.json([]);
    }

    /* =====================================================
       6️⃣ MATCH IGUAL ML
    ===================================================== */
    const resultado: any[] = [];

    for (const cupom of cupons) {
      const categoriaCupomNorm = normalize(cupom.categoria);

      // 🔥 filtro valor mínimo
      if (
        cupom.valor_minimo_compra &&
        cupom.valor_minimo_compra > valorProduto
      ) {
        continue;
      }

      let melhorNivel = 0;
      let categoriaMatch: string | null = null;

      for (const cat of categoriasProduto) {
        const nomeProdutoNorm = normalize(cat.nome);

        const sinonimoEncontrado = sinonimosNorm.find(s =>
          nomeProdutoNorm.includes(s.sinonimo)
        );

        const categoriaBaseNorm = sinonimoEncontrado
          ? sinonimoEncontrado.categoria_base
          : null;

        // Cupom geral
        if (categoriaCupomNorm === "geral") {
          categoriaMatch = "Geral";
          melhorNivel = cat.nivel;
          break;
        }

        // Match via categoria_base
        if (
          categoriaBaseNorm &&
          categoriaCupomNorm === categoriaBaseNorm
        ) {
          if (cat.nivel > melhorNivel) {
            melhorNivel = cat.nivel;
            categoriaMatch = cat.nome;
          }
        }

        // Match direto parcial
        if (nomeProdutoNorm.includes(categoriaCupomNorm)) {
          if (cat.nivel > melhorNivel) {
            melhorNivel = cat.nivel;
            categoriaMatch = cat.nome;
          }
        }
      }

      if (melhorNivel > 0 || categoriaCupomNorm === "geral") {
        resultado.push({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: categoriaMatch ?? "Geral",
          score_match: melhorNivel,
          score_confiabilidade: cupom.score_confiabilidade,
          regras: cupom.regras,
          descricao: cupom.descricao,
          valor: cupom.valor,
          vezes_click: cupom.vezes_click,
        });
      }
    }

    /* =====================================================
       7️⃣ ORDENAÇÃO FINAL
    ===================================================== */
    resultado.sort((a, b) => {
      if (b.score_match !== a.score_match) {
        return b.score_match - a.score_match;
      }
      if ((b.desconto_maximo || 0) !== (a.desconto_maximo || 0)) {
        return (b.desconto_maximo || 0) - (a.desconto_maximo || 0);
      }
      return (b.score_confiabilidade || 0) -
             (a.score_confiabilidade || 0);
    });

    return NextResponse.json(resultado);

  } catch (err: any) {
    console.error("Erro /api/cupom/shopee:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}
