import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    // 🔥 Remove cookies do Supabase Auth
    const cookieNames = [
      "sb-access-token",
      "sb-refresh-token",
    ];

    cookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
      });
    });

    return response;
  } catch (err) {
    console.error("Erro no logout:", err);
    return NextResponse.json(
      { error: "Erro ao fazer logout" },
      { status: 500 }
    );
  }
}
