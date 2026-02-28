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
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Mapear usuário legado
    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado ao Auth" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    // 4️⃣ Dados vindos do frontend (SEM user_id)
    const {
      produto_nome,
      produto_url,
      link_rastreado,
      valor,
      ganhos,
      perfil_aut,
      categoria_niveis = [],
      marca,
      produto_imagem,
    } = await req.json();

    // 5️⃣ Validação mínima
    if (
      !produto_nome ||
      !link_rastreado ||
      valor === null ||
      ganhos === null
    ) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // 6️⃣ Cálculos
    const ganho_estimado = valor * (ganhos / 100);
    const pontos = Math.round(ganho_estimado * 0.3 * 100);

    // 7️⃣ Inserção generate_link
    const { data, error } = await admin
      .from("generate_link")
      .insert([
        {
          user_id,
          produto_nome,
          produto_url,
          link_rastreado,
          valor,
          ganhos,
          ganho_estimado,
          pontos,
          perfil_aut,
          produto_imagem,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro insert generate_link:", error);
      return NextResponse.json(
        { error: "Erro ao registrar clique" },
        { status: 500 }
      );
    }

    // 8️⃣ Inserção categorias
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

        // rollback
        await admin
          .from("generate_link")
          .delete()
          .eq("id", data.id);

        return NextResponse.json(
          { error: "Erro ao inserir categorias" },
          { status: 500 }
        );
      }

      categoriasInseridas = catData || [];
    }

    // 9️⃣ Retorno final
    return NextResponse.json({
      success: true,
      generate_link: {
        id: data.id,
        produto_nome: data.produto_nome,
        pontos: data.pontos,
      },
      categoria_ml: categoriasInseridas,
      categoria: marca,
    });

  } catch (err: any) {
    console.error("API cliques erro:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
