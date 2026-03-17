import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getCompraConcluidaEmailTemplate } from "@/lib/email/templates/compra-concluida";

type EventoPendente = {
  id: string | number;
  user_id: string;
  produto_nome: string | null;
  produto_imagem: string | null;
  ganho_pontos: number | string | null;
};

type Usuario = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  allow_notifications: boolean | null;
};

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

async function enviarEmailsConclusaoML(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  limit = 50
) {
  const { data: eventos, error } = await supabase
    .from("ml_eventos")
    .select("id, user_id, produto_nome, produto_imagem, ganho_pontos")
    .eq("status", "CONFIRMADO_FINAL")
    .or("email_conclusao.is.null,email_conclusao.eq.false")
    .order("data_update", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!eventos?.length) return { encontrados: 0, enviados: 0 };

  let enviados = 0;

  for (const evento of eventos as EventoPendente[]) {
    try {
      const usuario = await buscarUsuario(supabase, evento.user_id);
      if (!usuario?.email) continue;

      if (usuario.allow_notifications === false) {
        await supabase
          .from("ml_eventos")
          .update({
            email_conclusao: true,
            data_email_conclusao: new Date().toISOString(),
          })
          .eq("id", evento.id);

        continue;
      }

      const nome = usuario.nickname || usuario.name || "Jogador";
      const origemFormatada = "Mercado Livre";

      const html = getCompraConcluidaEmailTemplate({
        userName: nome,
        produtoNome: evento.produto_nome || "Produto não informado",
        origem: origemFormatada,
        produtoImageUrl: evento.produto_imagem || undefined,
        pontosGanhos: Number(evento.ganho_pontos || 0),
        comprasUrl: `${process.env.SITE_URL}/dashboard/compras`,
        siteUrl: `${process.env.SITE_URL}`,
        suporteUrl: `${process.env.SITE_URL}/dashboard/ajuda`,
      });

      await sendEmail({
        to: usuario.email,
        subject: "Sua compra foi confirmada na BuyGain",
        html,
      });

      const { error: updateError } = await supabase
        .from("ml_eventos")
        .update({
          email_conclusao: true,
          data_email_conclusao: new Date().toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error("Erro ao atualizar email_conclusao ML:", evento.id, updateError);
        continue;
      }

      enviados++;
    } catch (err) {
      console.error("Erro enviando email de conclusão ML:", evento.id, err);
    }
  }

  return { encontrados: eventos.length, enviados };
}

async function enviarEmailsConclusaoShopee(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  limit = 50
) {
  const { data: eventos, error } = await supabase
    .from("shopee_eventos")
    .select("id, user_id, produto_nome, produto_imagem, ganho_pontos")
    .eq("status", "COMPLETED")
    .or("email_conclusao.is.null,email_conclusao.eq.false")
    .order("data_update", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!eventos?.length) return { encontrados: 0, enviados: 0 };

  let enviados = 0;

  for (const evento of eventos as EventoPendente[]) {
    try {
      const usuario = await buscarUsuario(supabase, evento.user_id);
      if (!usuario?.email) continue;

      if (usuario.allow_notifications === false) {
        await supabase
          .from("shopee_eventos")
          .update({
            email_conclusao: true,
            data_email_conclusao: new Date().toISOString(),
          })
          .eq("id", evento.id);

        continue;
      }

      const nome = usuario.nickname || usuario.name || "Jogador";
      const origemFormatada = "Shopee";

      const html = getCompraConcluidaEmailTemplate({
        userName: nome,
        produtoNome: evento.produto_nome || "Produto não informado",
        origem: origemFormatada,
        produtoImageUrl: evento.produto_imagem || undefined,
        pontosGanhos: Number(evento.ganho_pontos || 0),
        comprasUrl: `${process.env.SITE_URL}/dashboard/compras`,
        siteUrl: `${process.env.SITE_URL}`,
        suporteUrl: `${process.env.SITE_URL}/dashboard/ajuda`,
      });

      await sendEmail({
        to: usuario.email,
        subject: "Sua compra foi confirmada na BuyGain",
        html,
      });

      const { error: updateError } = await supabase
        .from("shopee_eventos")
        .update({
          email_conclusao: true,
          data_email_conclusao: new Date().toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error("Erro ao atualizar email_conclusao Shopee:", evento.id, updateError);
        continue;
      }

      enviados++;
    } catch (err) {
      console.error("Erro enviando email de conclusão Shopee:", evento.id, err);
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
    const batchSize = forceRun ? 200 : 50;

    const ml = await enviarEmailsConclusaoML(supabase, batchSize);
    const shopee = await enviarEmailsConclusaoShopee(supabase, batchSize);

    return NextResponse.json({
      ok: true,
      forceRun,
      ml,
      shopee,
    });
  } catch (error) {
    console.error("Erro no job enviar-email-compra-concluida:", error);
    return NextResponse.json(
      { error: "Erro ao enviar emails de conclusão" },
      { status: 500 }
    );
  }
}