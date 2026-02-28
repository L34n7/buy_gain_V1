import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const evento_id = formData.get("evento_id") as string;
    const file = formData.get("file") as File;
    const resposta = formData.get("resposta") as string | null;

    if (!evento_id || !file) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // 1️⃣ Supabase do usuário (AUTH)
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

    // 2️⃣ Supabase ADMIN
    const admin = await createAdminSupabase();

    // 3️⃣ Busca usuário legado
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

    // 4️⃣ Verifica se o evento pertence ao usuário
    const { data: evento, error: eventoError } = await admin
      .from("ml_eventos")
      .select("id, user_id")
      .eq("id", evento_id)
      .single();

    if (eventoError || !evento) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }

    if (evento.user_id !== user_id) {
      return NextResponse.json(
        { error: "Evento não pertence ao usuário" },
        { status: 403 }
      );
    }

    // 5️⃣ Monta caminho do arquivo
    const fileExt = file.name.split(".").pop();
    const filePath = `${user_id}/${evento_id}.${fileExt}`;

    // 6️⃣ Upload no Storage (ADMIN)
    const { error: uploadError } = await admin.storage
      .from("comprovantes")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error("Erro upload:", uploadError);
      return NextResponse.json(
        { error: "Erro ao enviar arquivo" },
        { status: 500 }
      );
    }

    // 7️⃣ Gera URL assinada (30 dias)
    const { data: signed, error: signedError } = await admin.storage
      .from("comprovantes")
      .createSignedUrl(filePath, 60 * 60 * 24 * 30);

    if (signedError) {
      console.error("Erro signed URL:", signedError);
      return NextResponse.json(
        { error: "Erro ao gerar link do arquivo" },
        { status: 500 }
      );
    }

    // 8️⃣ Atualiza evento
    const { error: updateError } = await admin
      .from("ml_eventos")
      .update({
        comprovante_url: signed?.signedUrl,
        resposta: resposta || null,
        status: "ANALISE_MANUAL",
        data_update: new Date().toISOString(),
      })
      .eq("id", evento_id);

    if (updateError) {
      console.error("Erro update evento:", updateError);
      return NextResponse.json(
        { error: "Erro ao salvar comprovante" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Erro API upload-prova:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
