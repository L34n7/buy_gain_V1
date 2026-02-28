import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(
  async (_req) => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    try {
      await supabase.rpc("ml_processar_unidades_produtos");
      await supabase.rpc("ml_processar_unidades_canceladas");
      await supabase.rpc("ml_avaliar_cancelamentos_provisorios");
      await supabase.rpc("ml_registrar_eventos_historico");

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("ERRO EDGE:", err);

      return new Response(
        JSON.stringify({ error: String(err) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  {
    verifyJwt: false,
  }
);
