import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

type ChamadoRow = {
  id: string;
  titulo: string | null;
  status: string;
  criado_em: string;
  avaliacao_nota: number | null;
  avaliacao_mensagem: string | null;
  avaliado_em: string | null;
};

type MensagemRow = {
  id: string;
  chamado_id: string;
  user_id: string | null;
  admin_id: string | null;
  autor_tipo: "USER" | "ADMIN";
  mensagem: string;
  imagem_path: string | null;
  criado_em: string;
};

export async function GET() {
  try {
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

    const admin = await createAdminSupabase();

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

    // 1) busca chamados
    const { data: chamados, error: chamadosError } = await admin
      .from("chamados_suporte")
      .select(
        "id, titulo, status, criado_em, avaliacao_nota, avaliacao_mensagem, avaliado_em"
      )
      .eq("user_id", user_id)
      .order("criado_em", { ascending: false });

    if (chamadosError) {
      console.error("Erro ao listar chamados:", chamadosError);
      return NextResponse.json(
        { error: "Erro ao buscar chamados." },
        { status: 500 }
      );
    }

    const chamadosLista = (chamados || []) as ChamadoRow[];

    if (chamadosLista.length === 0) {
      return NextResponse.json({
        success: true,
        chamados: [],
      });
    }

    const chamadoIds = chamadosLista.map((c) => c.id);

    // 2) busca todas as mensagens desses chamados
    const { data: mensagens, error: mensagensError } = await admin
      .from("chamados_mensagens")
      .select(
        "id, chamado_id, user_id, admin_id, autor_tipo, mensagem, imagem_path, criado_em"
      )
      .in("chamado_id", chamadoIds)
      .order("criado_em", { ascending: true });

    if (mensagensError) {
      console.error("Erro ao buscar mensagens dos chamados:", mensagensError);
      return NextResponse.json(
        { error: "Erro ao buscar mensagens dos chamados." },
        { status: 500 }
      );
    }

    // 3) gera signed URL dos anexos das mensagens
    const mensagensComImagem = await Promise.all(
      ((mensagens || []) as MensagemRow[]).map(async (msg) => {
        let imagem_url: string | null = null;

        if (msg.imagem_path) {
          const { data: signedData, error: signedError } = await admin.storage
            .from("chamados-suporte")
            .createSignedUrl(msg.imagem_path, 60 * 30);

          if (!signedError && signedData?.signedUrl) {
            imagem_url = signedData.signedUrl;
          }
        }

        return {
          ...msg,
          imagem_url,
        };
      })
    );

    // 4) agrupa mensagens por chamado
    const mensagensPorChamado = new Map<string, typeof mensagensComImagem>();

    for (const msg of mensagensComImagem) {
      const listaAtual = mensagensPorChamado.get(msg.chamado_id) || [];
      listaAtual.push(msg);
      mensagensPorChamado.set(msg.chamado_id, listaAtual);
    }

    // 5) monta resposta final
    const chamadosComMensagens = chamadosLista.map((chamado) => ({
      ...chamado,
      mensagens: mensagensPorChamado.get(chamado.id) || [],
    }));

    return NextResponse.json({
      success: true,
      chamados: chamadosComMensagens,
    });
  } catch (err) {
    console.error("Erro API listar chamados:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}