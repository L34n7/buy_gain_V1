import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

type ChamadoRow = {
  id: string;
  titulo: string | null;
  mensagem: string;
  imagem_path: string | null;
  status: string;
  criado_em: string;
  data_update: string;
};

export async function GET() {
  try {
    // 1️⃣ Auth do usuário logado
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

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();

    // 3️⃣ Buscar usuário legado
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

    // 4️⃣ Buscar chamados do usuário
    const { data: chamados, error: chamadosError } = await admin
      .from("chamados_suporte")
      .select("id, titulo, mensagem, imagem_path, status, criado_em, data_update")
      .eq("user_id", user_id)
      .order("criado_em", { ascending: false });

    if (chamadosError) {
      console.error("Erro ao listar chamados:", chamadosError);
      return NextResponse.json(
        { error: "Erro ao buscar chamados." },
        { status: 500 }
      );
    }

    // 5️⃣ Gerar signed URL para imagem privada
    const chamadosComImagem = await Promise.all(
      ((chamados || []) as ChamadoRow[]).map(async (chamado) => {
        let imagem_url: string | null = null;

        if (chamado.imagem_path) {
          const { data: signedData, error: signedError } = await admin.storage
            .from("chamados-suporte")
            .createSignedUrl(chamado.imagem_path, 60 * 30);

          if (!signedError && signedData?.signedUrl) {
            imagem_url = signedData.signedUrl;
          }
        }

        return {
          ...chamado,
          imagem_url,
        };
      })
    );

    return NextResponse.json({
      success: true,
      chamados: chamadosComImagem,
    });
  } catch (err) {
    console.error("Erro API listar chamados:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}