import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function GET() {
  try {
    // 1️⃣ Supabase com sessão do usuário (cookie)
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Buscar usuário legado
    const { data: appUser, error: appErr } = await admin
      .from("users")
      .select("id, name, admin")
      .eq("auth_user_id", user.id)
      .single();

    if (appErr || !appUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // 4️⃣ Retorno padronizado
    return NextResponse.json({
      user_id: appUser.id,
      user_name: appUser.name ?? null,
      admin: appUser.admin ?? false,
    });

  } catch (err) {
    console.error("Erro resolve user:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
