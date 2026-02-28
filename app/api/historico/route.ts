import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const page = Number(body?.page) || 1;
    const limit = Number(body?.limit) || 10;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1️⃣ Auth
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

    // 2️⃣ Admin
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

    // 4️⃣ Buscar histórico com paginação
    const { data, error, count } = await admin
      .from("generate_link")
      .select(
        `
        id,
        produto_nome,
        produto_url,
        link_rastreado,
        valor,
        pontos,
        data_criacao
      `,
        { count: "exact" } // 🔥 importante
      )
      .eq("user_id", user_id)
      .order("data_criacao", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Erro histórico:", error);
      return NextResponse.json(
        { error: "Erro ao buscar histórico" },
        { status: 500 }
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const conquistasData = await triggerConquistas(admin, user.id);

    return NextResponse.json({
      data,
      count: totalCount,
      page,
      totalPages,
      limit,

      ...(conquistasData || {}),
    });

  } catch (err) {
    console.error("Erro API histórico:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}