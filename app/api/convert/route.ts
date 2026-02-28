/* CHAMA AUTOMACAO LINK AUT */
import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST(req: Request): Promise<Response> {
  const { productUrl, platform } = await req.json();

  if (!productUrl) {
    return NextResponse.json(
      { error: "URL não informada" },
      { status: 400 }
    );
  }

  if (platform !== "mercadolivre") {
    return NextResponse.json(
      { error: "Plataforma não suportada" },
      { status: 400 }
    );
  }

  return new Promise<Response>((resolve) => {
    exec(
      `node mlCallAut.cjs "${productUrl}"`,
      {
        cwd: path.resolve(
          process.cwd(),
          "automacao/link_aut/scripts"
        ),
        timeout: 120000,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve(
            NextResponse.json(
              { error: stderr || error.message },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const matches = stdout.match(/\{[\s\S]*?\}/g);

          if (!matches || !matches.length) {
            throw new Error("Nenhum JSON encontrado");
          }

          const lastJson = matches[matches.length - 1];
          const result = JSON.parse(lastJson);

          if (typeof result.perfil_aut !== "number") {
            resolve(
              NextResponse.json(
                { error: "Perfil de automação não identificado" },
                { status: 500 }
              )
            );
            return;
          }

          resolve(NextResponse.json(result));
        } catch {
          resolve(
            NextResponse.json(
              { error: "Resposta inválida", raw: stdout },
              { status: 500 }
            )
          );
        }
      }
    );
  });
}