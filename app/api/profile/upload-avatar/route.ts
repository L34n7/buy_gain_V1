import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth do usuário (cookie)
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

    // 2️⃣ Ler FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    // 3️⃣ Validações extras (segurança)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato de imagem inválido" },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx 2MB)" },
        { status: 400 }
      );
    }

    // 4️⃣ Supabase admin (storage)
    const admin = await createAdminSupabase();

    // nome do arquivo (1 por usuário → sobrescreve)
    const fileName = `avatar-${user.id}.webp`;

    // 5️⃣ Upload
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(fileName, file, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      console.error("Erro upload avatar:", uploadError);
      return NextResponse.json(
        { error: "Erro ao salvar avatar" },
        { status: 500 }
      );
    }

    // 6️⃣ URL pública
    const { data } = admin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    if (!data?.publicUrl) {
      return NextResponse.json(
        { error: "Erro ao gerar URL do avatar" },
        { status: 500 }
      );
    }

    // 7️⃣ Retornar URL
    const cacheBustedUrl = `${data.publicUrl}?v=${Date.now()}`;

    return NextResponse.json({
      publicUrl: cacheBustedUrl,
    });


  } catch (err) {
    console.error("Erro upload-avatar:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
