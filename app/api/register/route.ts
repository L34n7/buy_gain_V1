import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarCodigoIndicacaoUnico } from "@/lib/indicacao/criarCodigoIndicacaoUnico";
import { normalizarCodigoIndicacao } from "@/lib/indicacao/gerarCodigoIndicacao";

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
    const { name, email, password, captchaToken, codigoIndicacao } =
      await req.json();

    const nomeLimpo = String(name || "").trim();
    const emailLimpo = String(email || "").trim().toLowerCase();
    const senhaLimpa = String(password || "");
    const codigoInformado = normalizarCodigoIndicacao(codigoIndicacao);

    /* ===============================
       1️⃣ VALIDAÇÕES BÁSICAS
    =============================== */
    if (!nomeLimpo || !emailLimpo || !senhaLimpa) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (senhaLimpa.length < 6) {
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
       2️⃣ VALIDA SE EMAIL JÁ EXISTE
       Evita problema do signUp mascarar usuário existente
    =============================== */
    const { data: usuarioExistente, error: usuarioExistenteError } =
      await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", emailLimpo)
        .maybeSingle();

    if (usuarioExistenteError) {
      console.error("Erro ao validar email existente:", usuarioExistenteError);
      return NextResponse.json(
        { error: "Erro ao validar email" },
        { status: 500 }
      );
    }

    if (usuarioExistente) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    /* ===============================
       3️⃣ VALIDA CÓDIGO DE INDICAÇÃO
    =============================== */
    let indicadorUserId: string | null = null;

    if (codigoInformado) {
      const { data: indicador, error: indicadorError } = await supabaseAdmin
        .from("users")
        .select("id, codigo_indicacao")
        .eq("codigo_indicacao", codigoInformado)
        .maybeSingle();

      if (indicadorError) {
        console.error("Erro ao buscar código de indicação:", indicadorError);
        return NextResponse.json(
          { error: "Erro ao validar código de indicação" },
          { status: 500 }
        );
      }

      if (!indicador) {
        return NextResponse.json(
          { error: "Código de indicação inválido" },
          { status: 400 }
        );
      }

      indicadorUserId = indicador.id;
    }

    /* ===============================
       4️⃣ GERA CÓDIGO DE INDICAÇÃO DO NOVO USUÁRIO
    =============================== */
    const codigoIndicacaoNovoUsuario = await criarCodigoIndicacaoUnico(
      supabaseAdmin,
      nomeLimpo
    );

    /* ===============================
       5️⃣ CRIA USUÁRIO NO AUTH
       Esse fluxo envia email de confirmação automaticamente
       se a confirmação de email estiver ativada no Supabase
    =============================== */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signUp({
        email: emailLimpo,
        password: senhaLimpa,
        options: {
          captchaToken,
          data: {
            name: nomeLimpo,
          },
        },
      });

    if (authError || !authData.user) {
      console.error("Erro ao criar usuário no auth:", authError);

      return NextResponse.json(
        { error: authError?.message || "Erro ao criar usuário" },
        { status: 400 }
      );
    }

    const authUserId = authData.user.id;

    /* ===============================
       6️⃣ CRIA REGISTRO NA TABELA public.users
    =============================== */
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        name: nomeLimpo,
        email: emailLimpo,
        auth_user_id: authUserId,
        created_at: new Date().toISOString(),
        codigo_indicacao: codigoIndicacaoNovoUsuario,
        codigo_indicacao_usado: codigoInformado || null,
        indicado_por_user_id: indicadorUserId,
      });

    if (insertError) {
      console.error("Erro ao criar usuário legado:", insertError);

      // rollback: remove usuário do auth se falhar ao criar em public.users
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: "Erro ao finalizar cadastro" },
        { status: 500 }
      );
    }

    /* ===============================
       7️⃣ SUCESSO
    =============================== */
    return NextResponse.json({
      success: true,
      codigo_indicacao: codigoIndicacaoNovoUsuario,
      precisa_confirmar_email: true,
      message:
        "Cadastro realizado com sucesso. Verifique seu email para confirmar a conta.",
    });
  } catch (err) {
    console.error("Erro API register:", err);

    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}