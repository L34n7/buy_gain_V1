import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";
import { triggerConquistas } from "@/lib/conquistas";

export async function GET() {
  try {
    // 1️⃣ Supabase com sessão do usuário
    const supabaseUser = await createUserSupabase();
    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // 2️⃣ Supabase admin
    const admin = await createAdminSupabase();
    const conquistasData = await triggerConquistas(admin, user.id);
    
    // 3️⃣ Buscar perfil do usuário
    const { data: profile, error: profileErr } = await admin
      .from("users")
      .select(`
        name,
        email,
        nickname,
        birth_date,
        phone,
        avatar_url,
        gender,
        city,
        state,
        allow_notifications,
        document_type,
        document_value,
        profile_completed,
        profile_completed_at
      `)
      .eq("auth_user_id", user.id)
      .single();

    let avatarSignedUrl = null;

    if (profile?.avatar_url) {
      const fileName = profile.avatar_url.split("/avatars/")[1]?.split("?")[0];

      if (fileName) {
        const { data: signedData } = await admin.storage
          .from("avatars")
          .createSignedUrl(fileName, 60 * 60);

        avatarSignedUrl = signedData?.signedUrl ?? null;
      }
    }

    // 4️⃣ Buscar progresso (XP / Level)
    const { data: progress, error: progressErr } = await admin
      .from("user_progress")
      .select("level, xp_current")
      .eq("auth_user_id", user.id)
      .single();

    if (progressErr || !progress) {
      return NextResponse.json(
        { error: "Progresso do usuário não encontrado" },
        { status: 500 }
      );
    }

    const xpProximoLevel = progress.level * 500;

    // 5️⃣ Buscar todas conquistas ativas
    const { data: todasConquistas, error: conquistasErr } = await admin
      .from("conquistas")
      .select("id, codigo, titulo, descricao, xp_recompensa")
      .eq("ativa", true)
      .order("criada_em", { ascending: true });

    if (conquistasErr) {
      return NextResponse.json(
        { error: "Erro ao buscar conquistas" },
        { status: 500 }
      );
    }

    // 6️⃣ Buscar conquistas desbloqueadas pelo usuário
    const { data: desbloqueadas, error: desbloqueadasErr } = await admin
      .from("conquistas_usuarios")
      .select("conquista_id")
      .eq("auth_user_id", user.id);

    if (desbloqueadasErr) {
      return NextResponse.json(
        { error: "Erro ao buscar conquistas do usuário" },
        { status: 500 }
      );
    }

    const conquistasDesbloqueadas = new Set(
      desbloqueadas?.map((c) => c.conquista_id) || []
    );

    // 7️⃣ Montar estrutura final de conquistas
    const achievements =
      todasConquistas?.map((conquista) => ({
        id: conquista.codigo,
        titulo: conquista.titulo,
        descricao: conquista.descricao,
        xp_recompensa: conquista.xp_recompensa ?? 0,
        unlocked: conquistasDesbloqueadas.has(conquista.id),
      })) || [];

    // 8️⃣ Se não houver perfil ainda
    if (profileErr || !profile) {
      return NextResponse.json({
        ...(conquistasData || {}),
        profile: {
          email: user.email,
          name: null,
          nickname: null,
          birth_date: null,
          phone: null,
          avatar_url: null,
          city: null,
          state: null,
          document_value: null,
          profile_completed: false,
          profile_completed_at: null,
        },

        stats: {
          pontos_disponiveis: 0,
          pontos_em_analise: 0,
          compras_aprovadas: 0,
          compras_em_analise: 0,
        },

        level: {
          level_atual: progress.level,
          xp_atual: progress.xp_current,
          xp_proximo_level: xpProximoLevel,
        },

        achievements,
      });
    }

    // 9️⃣ Retorno completo
    return NextResponse.json({
      ...(conquistasData || {}),
      profile: {
        ...profile,
        avatar_url: avatarSignedUrl,
        profile_completed: !!profile.profile_completed,
      },

      stats: {
        // ⚠️ Aqui depois você pode buscar do banco real
        pontos_disponiveis: 1250,
        pontos_em_analise: 430,
        compras_aprovadas: 18,
        compras_em_analise: 3,
      },

      level: {
        level_atual: progress.level,
        xp_atual: progress.xp_current,
        xp_proximo_level: xpProximoLevel,
      },

      achievements,
    });

  } catch (err) {
    console.error("Erro API profile:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}