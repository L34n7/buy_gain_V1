import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/email";
import { getCompraEmAnaliseEmail } from "@/lib/email/emailTemplates";

export async function GET(req: Request) {
  try {
const authHeader = req.headers.get("authorization");
const secret = process.env.CRON_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
}

    const admin = await createAdminSupabase();

    const { data: mlEventos, error: mlError } = await admin
      .from("ml_eventos")
      .select(`
        id,
        user_id,
        status,
        data_evento,
        produto_nome,
        produto_imagem
      `)
      .eq("email_analise_enviado", false)
      .not("status", "in", '("CRIADO","SEM_MATCH")')
      .limit(50);

    if (mlError) throw mlError;

    const { data: shopeeEventos, error: shopeeError } = await admin
      .from("shopee_eventos")
      .select(`
        id,
        user_id,
        status,
        data_evento,
        produto_nome,
        produto_imagem
      `)
      .eq("email_analise_enviado", false)
      .in("status", ["PENDING", "UNPAID"])
      .limit(50);

    if (shopeeError) throw shopeeError;

    const enviados: string[] = [];
    const erros: string[] = [];

    async function processarEvento(
      origem: "ml" | "shopee",
      evento: {
        id: string;
        user_id: string;
        status?: string;
        data_evento?: string;
        produto_nome?: string;
        produto_imagem?: string;
      }
    ) {
      try {
        const { data: usuario, error: userError } = await admin
          .from("users")
          .select("id, email, name")
          .eq("id", evento.user_id)
          .single();

        if (userError || !usuario?.email) {
          erros.push(`${origem}:${evento.id}:usuario-sem-email`);
          return;
        }

        const html = getCompraEmAnaliseEmail({
          nome: usuario.name || "usuário",
          produtoNome: evento.produto_nome,
          produtoImagem: evento.produto_imagem,
          dataEvento: evento.data_evento,
        });

        await sendEmail({
          to: "leandroisis100@gmail.com",
          subject: "Sua compra entrou em análise na BuyGain 👀",
          html,
        });

        const tabela = origem === "ml" ? "ml_eventos" : "shopee_eventos";

        const { error: updateError } = await admin
          .from(tabela)
          .update({
            email_analise_enviado: true,
            email_analise_enviado_em: new Date().toISOString(),
          })
          .eq("id", evento.id);

        if (updateError) {
          erros.push(`${origem}:${evento.id}:erro-update`);
          return;
        }

        enviados.push(`${origem}:${evento.id}`);
      } catch (error) {
        console.error("Erro processando evento:", origem, evento.id, error);
        erros.push(`${origem}:${evento.id}:erro-envio`);
      }
    }

    for (const evento of mlEventos ?? []) {
      await processarEvento("ml", evento);
    }

    for (const evento of shopeeEventos ?? []) {
      await processarEvento("shopee", evento);
    }

    return NextResponse.json({
      ok: true,
      enviados,
      erros,
      totalEnviados: enviados.length,
      totalErros: erros.length,
    });
  } catch (error) {
    console.error("Erro geral job email análise:", error);

    return NextResponse.json(
      { error: "Erro interno ao enviar e-mails" },
      { status: 500 }
    );
  }
}