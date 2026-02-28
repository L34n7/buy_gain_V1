import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { codigo } = await req.json();

  const supabaseUser = await createUserSupabase();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { erro: "Usuário não autenticado" },
      { status: 401 }
    );
  }

  const admin = await createAdminSupabase();

  const { data, error } = await admin.rpc("dar_xp_conquista", {
    p_auth_user_id: user.id,
    p_codigo_conquista: codigo,
  });

if (error) {
  return NextResponse.json(
    { erro: "Erro ao desbloquear conquista" },
    { status: 500 }
  );
}

// 🔔 Se subiu de nível, criar notificação
if (data?.subiu_level) {
  await admin.from("notificacoes").insert({
    user_id: user.id,
    tipo: "LEVEL_UP",
    titulo: "🚀 Novo nível alcançado!",
    descricao: `Você alcançou o nível ${data.novo_level} e desbloqueou uma recompensa especial!`,
    lida: false,
    created_at: new Date().toISOString(),
  });
}

return NextResponse.json({
  success: true,
  codigo: data.codigo,
  titulo: data.titulo,
  descricao: data.descricao,
  xp_gained: data.xp_ganho,
  leveled_up: data.subiu_level,
  new_level: data.novo_level,
});
}