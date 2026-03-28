import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 * - trim
 */
function normalize(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type CategoriaML = {
  categoria: string;
  nivel: number;
};

type CupomRow = {
  id_cupom: string;
  cupom: string;
  categoria: string | null;
  descricao: string | null;
  regras: string | null;
  valor: string | null;
  valor_minimo_compra: number | null;
  score_confiabilidade: number | null;
  desconto_maximo: number | null;
  vezes_click: number | null;
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
  categorias: CategoriaML[],
  mapaSinonimoParaBase: Map<string, string>,
  mapaBaseParaSinonimos: Map<string, Set<string>>
) {
  const categoriasBase = new Set<string>();
  const scorePorCategoriaBase = new Map<string, number>();
  const nomeExibicaoPorCategoriaBase = new Map<string, string>();

  for (const cat of categorias) {
    const categoriaNorm = normalize(cat.categoria);
    let categoriaBaseEncontrada: string | null = null;

    if (mapaSinonimoParaBase.has(categoriaNorm)) {
      categoriaBaseEncontrada = mapaSinonimoParaBase.get(categoriaNorm)!;
    } else {
      for (const [sinonimo, categoriaBase] of mapaSinonimoParaBase.entries()) {
        if (
          categoriaNorm.includes(sinonimo) ||
          sinonimo.includes(categoriaNorm)
        ) {
          categoriaBaseEncontrada = categoriaBase;
          break;
        }
      }
    }

    if (!categoriaBaseEncontrada) {
      categoriaBaseEncontrada = categoriaNorm;
    }

    categoriasBase.add(categoriaBaseEncontrada);

    const scoreAtual = scorePorCategoriaBase.get(categoriaBaseEncontrada) || 0;
    if (cat.nivel > scoreAtual) {
      scorePorCategoriaBase.set(categoriaBaseEncontrada, cat.nivel);
      nomeExibicaoPorCategoriaBase.set(categoriaBaseEncontrada, cat.categoria);
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
       1️⃣.1 PRODUTO / VALOR
    ----------------------------------------------- */
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

    const { mapaSinonimoParaBase, mapaBaseParaSinonimos } =
      montarMapaSinonimos(sinonimos);

    /* -----------------------------------------------
       2️⃣.2 RESOLVER CATEGORIAS-BASE DO PRODUTO
    ----------------------------------------------- */
    const categoriasProduto = (categorias || []) as CategoriaML[];

    const {
      categoriasBaseArray,
      scorePorCategoriaBase,
      nomeExibicaoPorCategoriaBase,
    } = resolverCategoriasBaseDoProduto(
      categoriasProduto,
      mapaSinonimoParaBase,
      mapaBaseParaSinonimos
    );

    /* -----------------------------------------------
       3️⃣ CUPONS ATIVOS (MERCADO LIVRE)
    ----------------------------------------------- */
    const hoje = new Date().toISOString().split("T")[0];

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
          valor_minimo_compra,
          score_confiabilidade,
          desconto_maximo,
          vezes_click
        `)
        .eq("ativo", true)
        .eq("loja", "Mercado Livre")
        .in("categoria", categoriasBaseArray)
        .or(`data_fim.is.null,data_fim.gte.${hoje}`);

      if (cupCatErr) {
        console.error("Erro cupons específicos:", cupCatErr);
        throw cupCatErr;
      }

      cuponsEspecificos = (cuponsCat || []) as CupomRow[];
    }

    const { data: cuponsGerais, error: cupGeraisErr } = await admin
      .from("cupom")
      .select(`
        id_cupom,
        cupom,
        categoria,
        descricao,
        regras,
        valor,
        valor_minimo_compra,
        score_confiabilidade,
        desconto_maximo,
        vezes_click
      `)
      .eq("ativo", true)
      .eq("loja", "Mercado Livre")
      .eq("categoria", "geral")
      .or(`data_fim.is.null,data_fim.gte.${hoje}`);

    if (cupGeraisErr) {
      console.error("Erro cupons gerais:", cupGeraisErr);
      throw cupGeraisErr;
    }

    const cupons = deduplicarCuponsPorId([
      ...cuponsEspecificos,
      ...((cuponsGerais || []) as CupomRow[]),
    ]);

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

      // filtro por valor mínimo
      if (
        cupom.valor_minimo_compra &&
        Number(cupom.valor_minimo_compra) > valorProduto
      ) {
        continue;
      }

      // Cupom geral
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

    /* -----------------------------------------------
       5️⃣ ORDENAÇÃO FINAL
    ----------------------------------------------- */
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