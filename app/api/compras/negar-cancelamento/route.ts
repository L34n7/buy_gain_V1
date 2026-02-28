import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { evento_id } = await req.json();

    if (!evento_id) {
      return NextResponse.json(
        { error: "Parâmetro evento_id ausente" },
        { status: 400 }
      );
    }

    // 1️⃣ Supabase do usuário (AUTH)
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

    // 2️⃣ Supabase ADMIN
    const admin = await createAdminSupabase();

    // 3️⃣ Busca usuário legado
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

    // 4️⃣ Verifica se o evento pertence ao usuário
    const { data: evento, error: eventoError } = await admin
      .from("ml_eventos")
      .select("id, user_id")
      .eq("id", evento_id)
      .single();

    if (eventoError || !evento) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }

    if (evento.user_id !== user_id) {
      return NextResponse.json(
        { error: "Evento não pertence ao usuário" },
        { status: 403 }
      );
    }

    // 5️⃣ Atualiza status → ANALISE_MANUAL
    const { error: updateError } = await admin
      .from("ml_eventos")
      .update({
        status: "ANALISE_MANUAL",
        data_update: new Date().toISOString(),
      })
      .eq("id", evento_id);

    if (updateError) {
      console.error("Erro negar cancelamento:", updateError);
      return NextResponse.json(
        { error: "Erro ao negar cancelamento" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro API negar-cancelamento:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
