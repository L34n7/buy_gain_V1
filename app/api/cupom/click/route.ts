import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { cupom_id } = await req.json();

    if (!cupom_id) {
      return NextResponse.json(
        { error: "Parâmetros ausentes" },
        { status: 400 }
      );
    }

    // Supabase admin (service role)
    const admin = await createAdminSupabase();

    const { error } = await admin.rpc(
      "cupom_incrementar_click",
      {
        p_cupom_id: cupom_id,
      }
    );

    if (error) {
      console.error("Erro incrementar clique do cupom:", error);
      return NextResponse.json(
        { error: "Erro ao registrar clique" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro API cupom click:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
