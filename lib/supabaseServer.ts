// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase vinculado ao usuário autenticado (Auth via cookies)
 */
export async function createUserSupabase() {
  const cookieStore = await cookies(); // ✅ OBRIGATÓRIO

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Supabase administrativo (Service Role)
 */
export async function createAdminSupabase() {
  await cookies(); // força contexto request-bound (Next exige)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // noop — admin não usa sessão
        },
      },
    }
  );
}
