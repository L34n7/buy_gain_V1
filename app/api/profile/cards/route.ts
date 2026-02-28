import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

function mapStatusShopee(status?: string) {
  switch (status) {
    case "PENDING":
    case "UNPAID":
      return "EM_ANALISE";
    case "COMPLETED":
      return "CONFIRMADO_FINAL";
    case "CANCELLED":
      return "CANCELADO_DEFINITIVO";
    default:
      return "EM_ANALISE";
  }
}

export async function POST() {
  try {
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

    const admin = await createAdminSupabase();

    const { data: legacyUser } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!legacyUser) {
      return NextResponse.json(
        { error: "Usuário não vinculado" },
        { status: 403 }
      );
    }

    const user_id = legacyUser.id;

    /* ==============================
       1️⃣ BUSCAR ML
    ============================== */
    const { data: mlEventos } = await admin
      .from("ml_eventos")
      .select("status, ganho_pontos")
      .eq("user_id", user_id)
      .not("status", "in", '("CRIADO","SEM_MATCH")');

    /* ==============================
       2️⃣ BUSCAR SHOPEE
    ============================== */
    const { data: shopeeEventos } = await admin
      .from("shopee_eventos")
      .select("status, ganho_pontos")
      .eq("user_id", user_id);

    const shopeeFormatado = (shopeeEventos ?? []).map((item: any) => ({
      status: mapStatusShopee(item.status),
      ganho_pontos: item.ganho_pontos ?? 0,
    }));

    const mlFormatado = (mlEventos ?? []).map((item: any) => ({
      status: item.status,
      ganho_pontos: item.ganho_pontos ?? 0,
    }));

    const todos = [...mlFormatado, ...shopeeFormatado];

    /* ==============================
       3️⃣ CÁLCULOS
    ============================== */

    const eventosEmAnalise = todos.filter(
      (e) =>
        e.status !== "DESCARTADO" &&
        e.status !== "CANCELADO_DEFINITIVO" &&
        e.status !== "CONFIRMADO_FINAL"
    );

    const eventosAprovados = todos.filter(
      (e) => e.status === "CONFIRMADO_FINAL"
    );

    const pontosEmAnalise = eventosEmAnalise.reduce(
      (total, e) => total + (e.ganho_pontos ?? 0),
      0
    );

    // 🔥 Calcular saldo igual /api/saldo
    const { data: extrato } = await admin
    .from("extrato_pontos")
    .select("tipo, pontos")
    .eq("user_id", user_id);

    const pontosDisponiveis = (extrato ?? []).reduce((acc, row) => {
    return row.tipo === "CREDITO"
        ? acc + row.pontos
        : acc - row.pontos;
    }, 0);

    return NextResponse.json({
      pontosDisponiveis: Number(pontosDisponiveis.toFixed(2)),
      pontosEmAnalise: Number(pontosEmAnalise.toFixed(2)),
      comprasEmAnalise: eventosEmAnalise.length,
      comprasAprovadas: eventosAprovados.length,
    });

  } catch (err) {
    console.error("Erro API profile/cards:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}