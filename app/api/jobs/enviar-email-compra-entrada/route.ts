import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getCompraEmAnaliseEmailTemplate } from "@/lib/email/templates/compra-em-analise";

type EventoPendente = {
  id: string | number;
  user_id: string;
  produto_nome: string | null;
  produto_imagem: string | null;
  origem: string | null;
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

async function enviarEmailsML(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>
) {
  const { data: eventos, error } = await supabase
    .from("ml_eventos")
    .select("id, user_id, produto_nome, produto_imagem, origem")
    .or("email_nova_compra.is.null,email_nova_compra.eq.false")
    .order("data_evento", { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!eventos?.length) return { encontrados: 0, enviados: 0 };

  let enviados = 0;

  for (const evento of eventos as EventoPendente[]) {
    try {
      const usuario = await buscarUsuario(supabase, evento.user_id);
      if (!usuario?.email) continue;

      // Se quiser respeitar a preferência do usuário
      if (usuario.allow_notifications === false) {
        await supabase
          .from("ml_eventos")
          .update({
            email_nova_compra: true,
            data_email_nova_compra: new Date().toISOString(),
          })
          .eq("id", evento.id);

        continue;
      }

      const nome = usuario.name || usuario.nickname || "cliente";

      const origemFormatada = "Mercado Livre";

        
      const html = getCompraEmAnaliseEmailTemplate({
        userName: nome,
        produtoNome: evento.produto_nome || "Produto não informado",
        origem: origemFormatada,
        produtoImageUrl: evento.produto_imagem || undefined,
        comprasUrl: `${process.env.SITE_URL}/dashboard/compras`,
        siteUrl: `${process.env.SITE_URL}`,
        suporteUrl: `${process.env.SITE_URL}/suporte`,
      });

      await sendEmail({
        to: usuario.email,
        subject: "Sua compra foi identificada na BuyGain",
        html,
      });

      const { error: updateError } = await supabase
        .from("ml_eventos")
        .update({
          email_nova_compra: true,
          data_email_nova_compra: new Date().toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error("Erro ao atualizar ML:", evento.id, updateError);
        continue;
      }

      enviados++;
    } catch (err) {
      console.error("Erro enviando email ML:", evento.id, err);
    }
  }

  return { encontrados: eventos.length, enviados };
}

async function enviarEmailsShopee(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>
) {
  const { data: eventos, error } = await supabase
    .from("shopee_eventos")
    .select("id, user_id, produto_nome, produto_imagem, origem")
    .or("email_nova_compra.is.null,email_nova_compra.eq.false")
    .order("data_evento", { ascending: true })
    .limit(50);

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
            email_nova_compra: true,
            data_email_nova_compra: new Date().toISOString(),
          })
          .eq("id", evento.id);

        continue;
      }

      const nome = usuario.name || usuario.nickname || "cliente";

      const origemFormatada = "Shopee";

    const html = getCompraEmAnaliseEmailTemplate({
      userName: nome,
      produtoNome: evento.produto_nome || "Produto não informado",
      origem: origemFormatada,
      produtoImageUrl: evento.produto_imagem || undefined,
      comprasUrl: `${process.env.SITE_URL}/dashboard/compras`,
      siteUrl: `${process.env.SITE_URL}`,
      suporteUrl: `${process.env.SITE_URL}/suporte`,
    });

    await sendEmail({
      to: usuario.email,
      subject: "Sua compra foi identificada na BuyGain",
      html,
    });

      const { error: updateError } = await supabase
        .from("shopee_eventos")
        .update({
          email_nova_compra: true,
          data_email_nova_compra: new Date().toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error("Erro ao atualizar Shopee:", evento.id, updateError);
        continue;
      }

      enviados++;
    } catch (err) {
      console.error("Erro enviando email Shopee:", evento.id, err);
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

    const ml = await enviarEmailsML(supabase);
    const shopee = await enviarEmailsShopee(supabase);

    return NextResponse.json({
      ok: true,
      forceRun,
      ml,
      shopee,
    });
  } catch (error) {
    console.error("Erro no job enviar-email-compra-entrada:", error);
    return NextResponse.json(
      { error: "Erro ao enviar emails de compra" },
      { status: 500 }
    );
  }
}