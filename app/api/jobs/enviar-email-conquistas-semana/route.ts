import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email/sendEmail";
import { getConquistasSemanaEmailTemplate } from "@/lib/email/templates/conquistas-semana";

type ConquistaRow = {
  id: string;
  auth_user_id: string;
  conquista_id: string;
  desbloqueada_em: string;
  email_semanal: boolean | null;
  data_email_semanal: string | null;
  conquista: {
    id: string;
    titulo: string;
    descricao: string | null;
    xp_recompensa: number | null;
    ativa: boolean | null;
  } | null;
};

type Usuario = {
  id: string;
  auth_user_id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  allow_notifications: boolean | null;
};

type UserProgress = {
  auth_user_id: string;
  level: number | null;
  xp_current: number | null;
  xp_total: number | null;
};

function getJanelaUltimos7DiasUtc() {
  const agora = new Date();
  const inicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    inicioIso: inicio.toISOString(),
    fimIso: agora.toISOString(),
  };
}

function calcularProximoNivel(level: number) {
  return level * 500;
}

async function buscarUsuario(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  authUserId: string
): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, name, nickname, email, allow_notifications")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar usuário:", authUserId, error);
    return null;
  }

  if (!data) {
    console.error("Usuário não encontrado para auth_user_id:", authUserId);
    return null;
  }

  return data as Usuario;
}

async function buscarProgresso(
  supabase: Awaited<ReturnType<typeof createAdminSupabase>>,
  userId: string
): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("auth_user_id, level, xp_current, xp_total")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar progresso do usuário:", userId, error);
    return null;
  }

  return (data as UserProgress | null) ?? null;
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
    const { inicioIso, fimIso } = getJanelaUltimos7DiasUtc();

    const { data: conquistasRows, error } = await supabase
    .from("conquistas_usuarios")
    .select(`
        id,
        auth_user_id,
        conquista_id,
        desbloqueada_em,
        email_semanal,
        data_email_semanal,
        conquista:conquistas (
        id,
        titulo,
        descricao,
        xp_recompensa,
        ativa
        )
    `)
    .gte("desbloqueada_em", inicioIso)
    .lte("desbloqueada_em", fimIso)
    .or("email_semanal.is.null,email_semanal.eq.false")
    .order("desbloqueada_em", { ascending: true })
    .returns<ConquistaRow[]>();

    if (error) {
      throw error;
    }

    if (!conquistasRows?.length) {
      return NextResponse.json({
        ok: true,
        forceRun,
        encontrados: 0,
        enviados: 0,
        mensagem: "Nenhuma conquista pendente para email semanal.",
      });
    }

    const rows = conquistasRows ?? [];

    const porUsuario = new Map<string, ConquistaRow[]>();

    for (const row of rows) {
      if (!row.auth_user_id) continue;
      if (!row.conquista) continue;
      if (row.conquista.ativa === false) continue;

      const lista = porUsuario.get(row.auth_user_id) ?? [];
      lista.push(row);
      porUsuario.set(row.auth_user_id, lista);
    }

    let enviados = 0;
    let usuariosComConquistas = 0;

    for (const [userId, conquistasUsuario] of porUsuario.entries()) {
      usuariosComConquistas++;

      try {
        const usuario = await buscarUsuario(supabase, userId);
        if (!usuario?.email) continue;

        if (usuario.allow_notifications === false) {
          const ids = conquistasUsuario.map((c) => c.id);

          await supabase
            .from("conquistas_usuarios")
            .update({
              email_semanal: true,
              data_email_semanal: new Date().toISOString(),
            })
            .in("id", ids);

          continue;
        }

        const progresso = await buscarProgresso(supabase, userId);

        const nome = usuario.nickname || usuario.name || "jogador";

        const conquistasFormatadas = conquistasUsuario.map((item) => ({
          titulo: item.conquista?.titulo || "Conquista desbloqueada",
          descricao: item.conquista?.descricao || null,
          xpRecompensa: Number(item.conquista?.xp_recompensa || 0),
          desbloqueadaEm: item.desbloqueada_em,
        }));

        const totalConquistas = conquistasFormatadas.length;
        const totalXpSemana = conquistasFormatadas.reduce(
          (acc, item) => acc + Number(item.xpRecompensa || 0),
          0
        );

        if (totalConquistas <= 0) {
          continue;
        }

        const levelAtual = Number(progresso?.level || 1);
        const xpAtual = Number(progresso?.xp_current || 0);
        const xpTotal = Number(progresso?.xp_total || 0);
        const xpNecessarioProximoNivel = calcularProximoNivel(levelAtual);
        const xpFaltaProximoNivel = Math.max(
          xpNecessarioProximoNivel - xpAtual,
          0
        );

        const html = getConquistasSemanaEmailTemplate({
          userName: nome,
          totalConquistas,
          totalXpSemana,
          levelAtual,
          xpAtual,
          xpTotal,
          xpNecessarioProximoNivel,
          xpFaltaProximoNivel,
          perfilUrl: `${process.env.SITE_URL}/dashboard/perfil`,
          siteUrl: `${process.env.SITE_URL}`,
          suporteUrl: `${process.env.SITE_URL}/dashboard/ajuda`,
          conquistas: conquistasFormatadas,
        });

        await sendEmail({
          to: usuario.email,
          subject: "Sua semana de conquistas na BuyGain 🏆",
          html,
        });

        const ids = conquistasUsuario.map((c) => c.id);

        const { error: updateError } = await supabase
          .from("conquistas_usuarios")
          .update({
            email_semanal: true,
            data_email_semanal: new Date().toISOString(),
          })
          .in("id", ids);

        if (updateError) {
          console.error(
            "Erro ao atualizar email_semanal das conquistas:",
            userId,
            updateError
          );
          continue;
        }

        enviados++;
      } catch (err) {
        console.error("Erro enviando email semanal de conquistas:", userId, err);
      }
    }

    return NextResponse.json({
      ok: true,
      forceRun,
      encontrados: rows.length,
      usuariosComConquistas,
      enviados,
      janela: {
        inicioIso,
        fimIso,
      },
    });
  } catch (error) {
    console.error("Erro no job enviar-email-conquistas-semana:", error);
    return NextResponse.json(
      { error: "Erro ao enviar email semanal de conquistas" },
      { status: 500 }
    );
  }
}