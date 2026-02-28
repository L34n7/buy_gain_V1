import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { welcomeEmailTemplate } from "@/lib/email/welcome";

export async function POST(req: NextRequest) {
  try {

    // 🔐 PROTEÇÃO DO WEBHOOK
    const authHeader = req.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const user = body.record;

    // 🔥 ENVIA SOMENTE QUANDO CONFIRMAR EMAIL (evita duplicação)
    if (
      body.old_record?.email_confirmed_at === null &&
      user.email_confirmed_at !== null
    ) {

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: '"BuyGain" <email@seudominio.com>',
        to: user.email,
        subject: "🚀 Bem-vindo à BuyGain!",
        html: welcomeEmailTemplate(user.email),
      });

      console.log("Welcome email enviado para:", user.email);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro webhook:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}