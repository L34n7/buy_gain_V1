import { NextResponse } from "next/server";
import {
  createAdminSupabase,
  createUserSupabase,
} from "@/lib/supabaseServer";

type ChamadoRow = {
  id: string;
  user_id: string;
  titulo: string | null;
  status: string;
  criado_em: string;
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

type UserRow = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
};

export async function GET(req: Request) {
  try {
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const admin = await createAdminSupabase();

    const { data: adminUser } = await admin
      .from("users")
      .select("id, admin")
      .eq("auth_user_id", user.id)
      .single();

    if (!adminUser || !adminUser.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const busca = searchParams.get("busca")?.trim().toLowerCase() || "";

    let chamadosQuery = admin
      .from("chamados_suporte")
      .select("id, user_id, titulo, status, criado_em")
      .order("criado_em", { ascending: false });

    if (status && status !== "TODOS") {
      chamadosQuery = chamadosQuery.eq("status", status);
    }

    const { data: chamados, error: chamadosError } = await chamadosQuery;

    if (chamadosError) {
      console.error("Erro ao buscar chamados:", chamadosError);
      return NextResponse.json(
        { error: "Erro ao listar chamados" },
        { status: 500 }
      );
    }

    const chamadosLista = (chamados || []) as ChamadoRow[];

    if (chamadosLista.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const userIds = [...new Set(chamadosLista.map((c) => c.user_id).filter(Boolean))];

    const { data: usersData, error: usersError } = await admin
      .from("users")
      .select("id, name, nickname, email")
      .in("id", userIds);

    if (usersError) {
      console.error("Erro ao buscar usuários dos chamados:", usersError);
      return NextResponse.json(
        { error: "Erro ao listar usuários dos chamados" },
        { status: 500 }
      );
    }

    const usersMap = new Map(
      ((usersData || []) as UserRow[]).map((u) => [u.id, u])
    );

    const chamadoIds = chamadosLista.map((c) => c.id);

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
        { error: "Erro ao listar mensagens dos chamados" },
        { status: 500 }
      );
    }

    const bucket = "chamados-suporte";

    const mensagensComImagem = await Promise.all(
      ((mensagens || []) as MensagemRow[]).map(async (msg) => {
        let imagem_url: string | null = null;

        if (msg.imagem_path) {
          const { data: signed } = await admin.storage
            .from(bucket)
            .createSignedUrl(msg.imagem_path, 60 * 30);

          imagem_url = signed?.signedUrl || null;
        }

        return {
          ...msg,
          imagem_url,
        };
      })
    );

    const mensagensPorChamado = new Map<string, typeof mensagensComImagem>();

    for (const msg of mensagensComImagem) {
      const atual = mensagensPorChamado.get(msg.chamado_id) || [];
      atual.push(msg);
      mensagensPorChamado.set(msg.chamado_id, atual);
    }

    let dataFinal = chamadosLista.map((item) => {
      const mensagensDoChamado = mensagensPorChamado.get(item.id) || [];
      const primeiraMensagemUser =
        mensagensDoChamado.find((m) => m.autor_tipo === "USER") || null;
      const ultimaMensagem =
        mensagensDoChamado.length > 0
          ? mensagensDoChamado[mensagensDoChamado.length - 1]
          : null;

      return {
        ...item,
        user: usersMap.get(item.user_id) || null,
        mensagens: mensagensDoChamado,
        primeira_mensagem: primeiraMensagemUser?.mensagem || "",
        ultima_mensagem: ultimaMensagem?.mensagem || "",
        ultima_interacao_em: ultimaMensagem?.criado_em || item.criado_em,
      };
    });

    if (busca) {
      dataFinal = dataFinal.filter((item) => {
        const nome = (item.user?.name ?? "").toLowerCase();
        const nickname = (item.user?.nickname ?? "").toLowerCase();
        const email = (item.user?.email ?? "").toLowerCase();

        const id = String(item.id ?? "").toLowerCase();
        const titulo = String(item.titulo ?? "").toLowerCase();

        const conteudoMensagens = (item.mensagens || [])
          .map((m) => String(m.mensagem || "").toLowerCase())
          .join(" ");

        return (
          id.includes(busca) ||
          titulo.includes(busca) ||
          conteudoMensagens.includes(busca) ||
          nome.includes(busca) ||
          nickname.includes(busca) ||
          email.includes(busca)
        );
      });
    }

    return NextResponse.json({ data: dataFinal });
  } catch (err) {
    console.error("Erro admin/chamados:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}