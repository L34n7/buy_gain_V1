// app/api/recompensas/trocar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    // valida token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const authUserId = userData.user.id;

    // resolver user legado
    const { data: appUser, error: appErr } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("auth_user_id", authUserId)
      .single();

    if (appErr || !appUser) {
      return NextResponse.json({ error: "Usuário da aplicação não encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const { giftcard_id, opcao_id } = body;
    if (!giftcard_id || !opcao_id) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // --- AQUI: verificar saldo do usuário e débito em transação ---
    // Exemplo de passos (implemente conforme seu modelo):
    // 1) buscar pontos do user (coluna ou somas)
    // 2) buscar pontos da opcao (giftcard_opcoes.pontos)
    // 3) if saldo < pontos -> return 400
    // 4) BEGIN TRANSACTION: inserir registro resgate, atualizar saldo (ou criar negative adjustment)
    // 5) COMMIT

    // Para começar, apenas retorna sucesso (substitua pela sua lógica real)
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro na troca:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
