import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
      // Remove qualquer cookie relacionado ao Supabase
      if (cookie.name.startsWith("sb-")) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }

    return response;
  } catch (err) {
    console.error("Erro no logout:", err);

    return NextResponse.json(
      { error: "Erro ao fazer logout" },
      { status: 500 }
    );
  }
}