import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ===============================
   CLIENTE AUTH (anon)
=============================== */
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ===============================
   CLIENTE ADMIN (service role)
=============================== */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { name, email, password, captchaToken } = await req.json();

    /* ===============================
       validações básicas
    =============================== */
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { error: "Captcha é obrigatório" },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ CRIA USUÁRIO NO AUTH
    =============================== */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          captchaToken: captchaToken,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          data: {
            name: name,
          },
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Erro ao criar usuário" },
        { status: 400 }
      );
    }

    const authUserId = authData.user.id;

    /* ===============================
       2️⃣ CRIA USUÁRIO LEGADO
    =============================== */
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        name,
        email,
        auth_user_id: authUserId,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Erro ao criar usuário legado:", insertError);

      // rollback: remove do auth se falhar
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: "Erro ao finalizar cadastro" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro API register:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
