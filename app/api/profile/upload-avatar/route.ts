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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

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

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

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

    const admin = createAdminSupabase();

    const fileName = `avatar-${user.id}.webp`;
    const fileBody = new Uint8Array(outputBuffer);

    console.log("Iniciando upload avatar...", {
      userId: user.id,
      fileName,
      originalSize: file.size,
      processedSize: outputBuffer.length,
      originalType: file.type,
    });

    const startedAt = Date.now();

    let uploadError: any = null;

    const updateRes = await admin.storage.from("avatars").update(fileName, fileBody, {
      contentType: "image/webp",
      cacheControl: "3600",
    });

    uploadError = updateRes.error;

    if (uploadError) {
      const message = String(uploadError.message || "").toLowerCase();

      const seemsMissingFile =
        message.includes("not found") ||
        message.includes("does not exist") ||
        message.includes("no such") ||
        message.includes("404") ||
        message.includes("object not found");

      if (seemsMissingFile) {
        console.log("Arquivo ainda não existe. Fazendo upload inicial...");

        const createRes = await admin.storage.from("avatars").upload(fileName, fileBody, {
          upsert: false,
          contentType: "image/webp",
          cacheControl: "3600",
        });

        uploadError = createRes.error;
      }
    }

    console.log("Upload avatar finalizado em ms:", Date.now() - startedAt);

    if (uploadError) {
      console.error("Erro upload avatar:", {
        message: uploadError.message,
        name: uploadError.name,
        status: (uploadError as any).status ?? null,
        statusCode: (uploadError as any).statusCode ?? null,
        error: (uploadError as any).error ?? null,
        details: (uploadError as any).details ?? null,
      });

      return NextResponse.json(
        {
          error: "Erro ao salvar avatar",
          details: uploadError.message,
          code: (uploadError as any).statusCode ?? null,
        },
        { status: 500 }
      );
    }

    const { data, error: signedError } = await admin.storage
      .from("avatars")
      .createSignedUrl(fileName, 60 * 60); // 1 hora

    if (signedError || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Erro ao gerar URL do avatar" },
        { status: 500 }
      );
    }

    const cacheBustedUrl = `${data.signedUrl}&v=${Date.now()}`;

    return NextResponse.json({
      publicUrl: cacheBustedUrl,
      fileName,
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