import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function GET() {
  try {
    // 🔐 Verifica usuário autenticado
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await createAdminSupabase();

    // 🔔 Busca notificações não lidas
    const { data, error } = await admin
      .from("notificacoes")
      .select("id, tipo, titulo, descricao, created_at")
      .eq("user_id", user.id)
      .eq("lida", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar notificações:", error);
      return NextResponse.json(
        { error: "Erro ao buscar notificações" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });

  } catch (err) {
    console.error("Erro API notificacoes:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
