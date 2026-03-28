import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

/* -----------------------------------------
   Utils
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

type CategoriaProduto = {
  nome: string;
  nomeNorm: string;
  nivel: number;
};

type CupomRow = {
  id_cupom: string;
  cupom: string;
  categoria: string | null;
  descricao: string | null;
  regras: string | null;
  valor: string | null;
  desconto_maximo: number | null;
  score_confiabilidade: number | null;
  vezes_click: number | null;
  valor_minimo_compra: number | null;
  loja: string;
  data_inicio: string | null;
  data_fim: string | null;
};

function montarMapaSinonimos(
  sinonimos:
    | {
        categoria_base: string;
        sinonimo: string;
      }[]
    | null
    | undefined
) {
  const mapaSinonimoParaBase = new Map<string, string>();
  const mapaBaseParaSinonimos = new Map<string, Set<string>>();

  for (const item of sinonimos || []) {
    const categoriaBase = normalize(item.categoria_base);
    const sinonimo = normalize(item.sinonimo);

    if (!categoriaBase || !sinonimo) continue;

    mapaSinonimoParaBase.set(sinonimo, categoriaBase);

    if (!mapaBaseParaSinonimos.has(categoriaBase)) {
      mapaBaseParaSinonimos.set(categoriaBase, new Set<string>());
    }

    mapaBaseParaSinonimos.get(categoriaBase)!.add(sinonimo);
  }

  return { mapaSinonimoParaBase, mapaBaseParaSinonimos };
}

function resolverCategoriasBaseDoProduto(
  categoriasProduto: CategoriaProduto[],
  mapaSinonimoParaBase: Map<string, string>,
  mapaBaseParaSinonimos: Map<string, Set<string>>
) {
  const categoriasBase = new Set<string>();
  const scorePorCategoriaBase = new Map<string, number>();
  const nomeExibicaoPorCategoriaBase = new Map<string, string>();

  for (const cat of categoriasProduto) {
    const nomeNorm = cat.nomeNorm;

    let categoriaBaseEncontrada: string | null = null;

    if (mapaSinonimoParaBase.has(nomeNorm)) {
      categoriaBaseEncontrada = mapaSinonimoParaBase.get(nomeNorm)!;
    } else {
      for (const [sinonimo, categoriaBase] of mapaSinonimoParaBase.entries()) {
        if (
          nomeNorm.includes(sinonimo) ||
          sinonimo.includes(nomeNorm)
        ) {
          categoriaBaseEncontrada = categoriaBase;
          break;
        }
      }
    }

    if (!categoriaBaseEncontrada) {
      categoriaBaseEncontrada = nomeNorm;
    }

    categoriasBase.add(categoriaBaseEncontrada);

    const scoreAtual = scorePorCategoriaBase.get(categoriaBaseEncontrada) || 0;
    if (cat.nivel > scoreAtual) {
      scorePorCategoriaBase.set(categoriaBaseEncontrada, cat.nivel);
      nomeExibicaoPorCategoriaBase.set(categoriaBaseEncontrada, cat.nome);
    }

    const sinonimosDaBase = mapaBaseParaSinonimos.get(categoriaBaseEncontrada);
    if (sinonimosDaBase) {
      for (const sinonimo of sinonimosDaBase) {
        categoriasBase.add(sinonimo);
      }
    }
  }

  categoriasBase.delete("geral");

  return {
    categoriasBaseArray: Array.from(categoriasBase),
    scorePorCategoriaBase,
    nomeExibicaoPorCategoriaBase,
  };
}

function deduplicarCuponsPorId(cupons: CupomRow[]) {
  const mapa = new Map<string, CupomRow>();

  for (const cupom of cupons) {
    mapa.set(cupom.id_cupom, cupom);
  }

  return Array.from(mapa.values());
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
       1) Buscar generate_link
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
       2) Buscar categorias do produto
    ===================================================== */
    const { data: categoriasEvento, error: catErr } = await admin
      .from("categoria_shopee")
      .select("categoria_id, nivel")
      .eq("generate_link_id", linkData.id)
      .order("nivel", { ascending: false });

    if (catErr) throw catErr;

    /* =====================================================
       3) Se não houver categoria do produto, retorna cupons gerais
    ===================================================== */
    if (!categoriasEvento || categoriasEvento.length === 0) {
      const { data: cuponsGerais, error: geraisErr } = await admin
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
        .eq("loja", "Shopee")
        .eq("categoria", "geral")
        .or(`data_fim.is.null,data_fim.gte.${hoje}`);

      if (geraisErr) throw geraisErr;

      const resultadoGerais = (cuponsGerais || [])
        .filter((cupom) => {
          if (
            cupom.valor_minimo_compra &&
            Number(cupom.valor_minimo_compra) > valorProduto
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          if ((b.desconto_maximo || 0) !== (a.desconto_maximo || 0)) {
            return (b.desconto_maximo || 0) - (a.desconto_maximo || 0);
          }

          if ((b.score_confiabilidade || 0) !== (a.score_confiabilidade || 0)) {
            return (b.score_confiabilidade || 0) - (a.score_confiabilidade || 0);
          }

          return (b.vezes_click || 0) - (a.vezes_click || 0);
        })
        .map((cupom) => ({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: "Geral",
          tipo_match: "geral",
          score_match: 0,
          score_confiabilidade: cupom.score_confiabilidade,
          regras: cupom.regras,
          descricao: cupom.descricao,
          valor: cupom.valor,
          vezes_click: cupom.vezes_click,
        }));

      return NextResponse.json(resultadoGerais);
    }

    const categoriaIds = categoriasEvento.map((c) => c.categoria_id);

    /* =====================================================
       4) Buscar nomes oficiais
    ===================================================== */
    const { data: categoriasBase, error: baseErr } = await admin
      .from("categoria_shopee_base")
      .select("id, nome")
      .in("id", categoriaIds);

    if (baseErr) throw baseErr;

    if (!categoriasBase || categoriasBase.length === 0) {
      return NextResponse.json([]);
    }

    const categoriasProduto: CategoriaProduto[] = categoriasEvento
      .map((cat) => {
        const base = categoriasBase.find((b) => b.id === cat.categoria_id);
        return base
          ? {
              nome: base.nome,
              nomeNorm: normalize(base.nome),
              nivel: cat.nivel,
            }
          : null;
      })
      .filter(Boolean) as CategoriaProduto[];

    if (categoriasProduto.length === 0) {
      return NextResponse.json([]);
    }

    /* =====================================================
       5) Buscar sinônimos
    ===================================================== */
    const { data: sinonimos, error: sinonimosErr } = await admin
      .from("categoria_sinonimo")
      .select("categoria_base, sinonimo");

    if (sinonimosErr) throw sinonimosErr;

    const { mapaSinonimoParaBase, mapaBaseParaSinonimos } =
      montarMapaSinonimos(sinonimos);

    const {
      categoriasBaseArray,
      scorePorCategoriaBase,
      nomeExibicaoPorCategoriaBase,
    } = resolverCategoriasBaseDoProduto(
      categoriasProduto,
      mapaSinonimoParaBase,
      mapaBaseParaSinonimos
    );

    /* =====================================================
       6) Buscar cupons específicos
    ===================================================== */
    let cuponsEspecificos: CupomRow[] = [];

    if (categoriasBaseArray.length > 0) {
      const { data: cuponsCat, error: cupCatErr } = await admin
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
        .eq("loja", "Shopee")
        .in("categoria", categoriasBaseArray)
        .or(`data_fim.is.null,data_fim.gte.${hoje}`);

      if (cupCatErr) throw cupCatErr;

      cuponsEspecificos = (cuponsCat || []) as CupomRow[];
    }

    /* =====================================================
       7) Buscar cupons gerais
    ===================================================== */
    const { data: cuponsGerais, error: cupGeraisErr } = await admin
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
      .eq("loja", "Shopee")
      .eq("categoria", "geral")
      .or(`data_fim.is.null,data_fim.gte.${hoje}`);

    if (cupGeraisErr) throw cupGeraisErr;

    const cupons = deduplicarCuponsPorId([
      ...cuponsEspecificos,
      ...((cuponsGerais || []) as CupomRow[]),
    ]);

    if (cupons.length === 0) {
      return NextResponse.json([]);
    }

    /* =====================================================
       8) MATCH + FILTRO
    ===================================================== */
    const resultado: any[] = [];

    for (const cupom of cupons) {
      const categoriaCupomNorm = normalize(cupom.categoria);

      if (
        cupom.valor_minimo_compra &&
        Number(cupom.valor_minimo_compra) > valorProduto
      ) {
        continue;
      }

      if (categoriaCupomNorm === "geral") {
        resultado.push({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: "Geral",
          tipo_match: "geral",
          score_match: 0,
          score_confiabilidade: cupom.score_confiabilidade,
          regras: cupom.regras,
          descricao: cupom.descricao,
          valor: cupom.valor,
          vezes_click: cupom.vezes_click,
        });
        continue;
      }

      let melhorNivel = 0;
      let categoriaMatch = "Geral";

      const categoriaBaseDoCupom =
        mapaSinonimoParaBase.get(categoriaCupomNorm) || categoriaCupomNorm;

      const scoreDaBase = scorePorCategoriaBase.get(categoriaBaseDoCupom) || 0;

      if (scoreDaBase > melhorNivel) {
        melhorNivel = scoreDaBase;
        categoriaMatch =
          nomeExibicaoPorCategoriaBase.get(categoriaBaseDoCupom) ||
          categoriaBaseDoCupom;
      }

      if (melhorNivel > 0) {
        resultado.push({
          id_cupom: cupom.id_cupom,
          cupom: cupom.cupom,
          desconto_maximo: cupom.desconto_maximo,
          categoria_match: categoriaMatch,
          tipo_match: "categoria",
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
       9) ORDENAÇÃO FINAL
    ===================================================== */
    resultado.sort((a, b) => {
      const pesoTipoA = a.tipo_match === "categoria" ? 1 : 0;
      const pesoTipoB = b.tipo_match === "categoria" ? 1 : 0;

      if (pesoTipoB !== pesoTipoA) {
        return pesoTipoB - pesoTipoA;
      }

      if (b.score_match !== a.score_match) {
        return b.score_match - a.score_match;
      }

      if ((b.desconto_maximo || 0) !== (a.desconto_maximo || 0)) {
        return (b.desconto_maximo || 0) - (a.desconto_maximo || 0);
      }

      if ((b.score_confiabilidade || 0) !== (a.score_confiabilidade || 0)) {
        return (b.score_confiabilidade || 0) - (a.score_confiabilidade || 0);
      }

      return (b.vezes_click || 0) - (a.vezes_click || 0);
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