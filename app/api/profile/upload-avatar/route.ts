import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 512; // avatar final 512x512
const OUTPUT_QUALITY = 78;

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
        { error: "Formato de imagem inválido. Envie JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx 5MB)" },
        { status: 400 }
      );
    }

    // 4️⃣ Converter File -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 5️⃣ Processar imagem
    // rotate() corrige orientação com base no EXIF
    // resize() reduz para tamanho ideal de avatar
    // webp() comprime e padroniza formato
    let outputBuffer: Buffer;

    try {
      outputBuffer = await sharp(inputBuffer, {
        failOn: "error",
      })
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "cover",
          position: "centre",
          withoutEnlargement: true,
        })
        .webp({
          quality: OUTPUT_QUALITY,
        })
        .toBuffer();
    } catch (imageError) {
      console.error("Erro ao processar imagem:", imageError);
      return NextResponse.json(
        { error: "Não foi possível processar a imagem enviada" },
        { status: 400 }
      );
    }

    // 6️⃣ Supabase admin (storage)
    const admin = await createAdminSupabase();

    // nome fixo por usuário → sobrescreve sempre
    const fileName = `avatar-${user.id}.webp`;

    // 7️⃣ Upload do arquivo já comprimido
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(fileName, outputBuffer, {
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

    // 8️⃣ URL pública
    const { data } = admin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    if (!data?.publicUrl) {
      return NextResponse.json(
        { error: "Erro ao gerar URL do avatar" },
        { status: 500 }
      );
    }

    // 9️⃣ Cache bust
    const cacheBustedUrl = `${data.publicUrl}?v=${Date.now()}`;

    return NextResponse.json({
      publicUrl: cacheBustedUrl,
      optimized: true,
      originalSize: file.size,
      optimizedSize: outputBuffer.length,
    });
  } catch (err) {
    console.error("Erro upload-avatar:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}