import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getCompraPendenteMLEmailTemplate } from "@/lib/email/templates/compra-pendente-ml";

type Usuario = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  allow_notifications: boolean | null;
};

type EventoPendenteML = {
  id: string | number;
  user_id: string;
  produto_nome: string | null;
  produto_imagem: string | null;
  status: string | null;
  data_update: string | null;
};

const STATUSS_PENDENTES_ML = [
  "AGUARDANDO_RESPOSTA_CANCELADO",
  "SOLICITAR_PROVA",
  "AGUARDANDO_CONFIRMACAO",
];

const PRAZOS_STATUS: Record<string, number> = {
  AGUARDANDO_RESPOSTA_CANCELADO: 6,
  SOLICITAR_PROVA: 13,
  AGUARDANDO_CONFIRMACAO: 13,
};

function getSiteUrl() {
  return process.env.SITE_URL || "http://localhost:3000";
}

function formatarDataBR(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return dataIso;
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

function calcularDataLimite(baseIso: string, prazoDias: number) {
  const base = new Date(baseIso);

  if (Number.isNaN(base.getTime())) {
    throw new Error(`Data base inválida: ${baseIso}`);
  }

  const limite = new Date(base.getTime());
  limite.setDate(limite.getDate() + prazoDias);

  return limite.toISOString();
}

function calcularDiasRestantes(dataLimiteIso: string) {
  const agora = new Date();
  const limite = new Date(dataLimiteIso);

  if (Number.isNaN(limite.getTime())) {
    return 0;
  }

  const diffMs = limite.getTime() - agora.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

async function buscarUsuario(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  userId: string
): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, nickname, email, allow_notifications")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar usuário:", userId, error);
    return null;
  }

  return data as Usuario;
}

async function enviarEmailsPendentesML(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  limit = 100
) {
  const { data, error } = await supabase
    .from("ml_eventos")
    .select("id, user_id, produto_nome, produto_imagem, status, data_update")
    .in("status", STATUSS_PENDENTES_ML)
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const eventos = (data ?? []) as EventoPendenteML[];

  if (!eventos.length) {
    return { encontrados: 0, enviados: 0 };
  }

  let enviados = 0;
  const siteUrl = getSiteUrl();

  for (const evento of eventos) {
    try {
      const usuario = await buscarUsuario(supabase, evento.user_id);

      if (!usuario?.email) {
        continue;
      }

      if (usuario.allow_notifications === false) {
        continue;
      }

      const nome = usuario.nickname || usuario.name || "Jogador";
      const status = String(evento.status || "PENDENTE");
      const prazoDias = PRAZOS_STATUS[status] ?? 3;
      const dataBase = evento.data_update;

      if (!dataBase) {
        console.error(
          "Evento sem data_update para calcular prazo:",
          evento.id
        );
        continue;
      }

      const dataLimiteIso = calcularDataLimite(dataBase, prazoDias);
      const dataLimiteFormatada = formatarDataBR(dataLimiteIso);
      const diasRestantes = calcularDiasRestantes(dataLimiteIso);

      const html = getCompraPendenteMLEmailTemplate({
        userName: nome,
        produtoNome: evento.produto_nome || "Produto não informado",
        status,
        prazoDias,
        dataLimite: dataLimiteFormatada,
        diasRestantes,
        produtoImageUrl: evento.produto_imagem || undefined,
        dashboardUrl: `${siteUrl}/dashboard`,
        siteUrl,
        suporteUrl: `${siteUrl}/dashboard/ajuda`,
      });

      await sendEmail({
        to: usuario.email,
        subject: "Ação necessária: responda sua compra pendente na BuyGain",
        html,
      });

      const { error: updateError } = await supabase
        .from("ml_eventos")
        .update({
          data_email_pendente: new Date().toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error(
          "Erro ao atualizar data_email_pendente:",
          evento.id,
          updateError
        );
      }

      enviados++;
    } catch (err) {
      console.error("Erro enviando email pendente ML:", evento.id, err);
    }
  }

  return { encontrados: eventos.length, enviados };
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get("forceRun") === "true";

    if (!forceRun && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await createAdminSupabase();
    const batchSize = forceRun ? 300 : 100;

    const ml = await enviarEmailsPendentesML(supabase, batchSize);

    return NextResponse.json({
      ok: true,
      forceRun,
      ml,
    });
  } catch (error) {
    console.error("Erro no job enviar-email-compra-pendente:", error);
    return NextResponse.json(
      { error: "Erro ao enviar emails de pendência" },
      { status: 500 }
    );
  }
}