import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    // 1️⃣ Supabase do usuário (Auth via cookie)
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Se estiver logado, tenta mapear usuário legado
    let user_id: string | null = null;
    let isGuest = true;

    if (user) {
      const { data: legacyUser, error: legacyError } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!legacyError && legacyUser?.id) {
        user_id = legacyUser.id;
        isGuest = false;
      }
    }

    // 4️⃣ Dados vindos do frontend
    const {
      produto_nome,
      produto_url,
      link_rastreado,
      valor,
      ganhos,
      perfil_aut,
      categoria_niveis = [],
      marca,
    } = await req.json();

    // 5️⃣ Validação mínima
    if (!produto_nome || !produto_url || !link_rastreado) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // 6️⃣ Buscar o registro já criado em /api/gerar-link
    const tresMinutosAtras = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    let existingQuery = admin
      .from("generate_link")
      .select("id, produto_nome, pontos, link_rastreado, user_id")
      .eq("produto_url", produto_url)
      .eq("link_rastreado", link_rastreado)
      .gte("data_criacao", tresMinutosAtras)
      .order("data_criacao", { ascending: false })
      .limit(1);

    if (!isGuest && user_id) {
      existingQuery = existingQuery.eq("user_id", user_id);
    } else {
      existingQuery = existingQuery.is("user_id", null);
    }

    const { data: existingLink, error: existingError } =
      await existingQuery.maybeSingle();

    if (existingError) {
      console.error("Erro ao buscar generate_link existente:", existingError);
      return NextResponse.json(
        { error: "Erro ao localizar link gerado" },
        { status: 500 }
      );
    }

    if (!existingLink) {
      return NextResponse.json(
        { error: "Link gerado não encontrado para registrar categorias" },
        { status: 404 }
      );
    }

    // 7️⃣ Inserção categorias
    let categoriasInseridas: any[] = [];

    if (Array.isArray(categoria_niveis)) {
      const MAX_LEVELS = 10;
      const safeLevels = categoria_niveis.slice(0, MAX_LEVELS);

      const rows: any[] = [];

      // categorias do produto
      safeLevels.forEach((cat: string, idx: number) => {
        if (cat?.trim()) {
          rows.push({
            link_rastreado,
            nivel: idx + 2,
            categoria: cat.trim(),
          });
        }
      });

      // categoria geral
      rows.push({
        link_rastreado,
        nivel: 1,
        categoria: "Geral",
      });

      // categoria marca
      if (marca?.trim()) {
        rows.push({
          link_rastreado,
          nivel: 100,
          categoria: marca.trim(),
        });
      }

      const { data: catData, error: catErr } = await admin
        .from("categoria_ml")
        .upsert(rows, { onConflict: "link_rastreado,nivel" })
        .select();

      if (catErr) {
        console.error("Erro categoria_ml:", catErr);
        return NextResponse.json(
          { error: "Erro ao inserir categorias" },
          { status: 500 }
        );
      }

      categoriasInseridas = catData || [];
    }

    // 8️⃣ Retorno final
    return NextResponse.json({
      success: true,
      guest_mode: isGuest,
      generate_link: {
        id: existingLink.id,
        produto_nome: existingLink.produto_nome,
        pontos: existingLink.pontos,
      },
      categoria_ml: categoriasInseridas,
      categoria: marca ?? null,
    });
  } catch (err: any) {
    console.error("API cliques erro:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}