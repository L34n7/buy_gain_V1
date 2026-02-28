import { NextResponse } from "next/server";
import { createUserSupabase, createAdminSupabase } from "@/lib/supabaseServer";

export async function POST() {
  try {
    // Auth
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: [] });
    }

    const admin = await createAdminSupabase();

    // mapear auth → users
    const { data: legacyUser } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!legacyUser) {
      return NextResponse.json({ data: [] });
    }

    // buscar créditos recentes
    const { data } = await admin
      .from("extrato_pontos")
      .select("id, pontos, criado_em")
      .eq("user_id", legacyUser.id)
      .eq("tipo", "CREDITO")
      .eq("origem", "ML_EVENTO")
      .order("criado_em", { ascending: false })
      .limit(5);

    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
