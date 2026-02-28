"use client";

import { useEffect } from "react";

export default function GlobalXpInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      try {
        const cloned = response.clone();
        const data = await cloned.json();

        // 🔥 CASO API RETORNE ARRAY DE CONQUISTAS
        if (Array.isArray(data?.conquistas)) {
          data.conquistas.forEach((c: any) => {
            window.dispatchEvent(
              new CustomEvent("xp:updated", {
                detail: {
                  xp_gained: c.xp_ganho,
                  leveled_up: c.subiu_level,
                  new_level: c.novo_level,
                  conquista_titulo: c.titulo,
                  conquista_descricao: c.descricao,
                },
              })
            );
          });

          return response; // ⚠ IMPORTANTE: evita duplicação
        }

        // 🔥 CASO PADRÃO (CONQUISTA INDIVIDUAL)
        if (data?.xp_gained || data?.xp_ganho) {
          window.dispatchEvent(
            new CustomEvent("xp:updated", {
              detail: {
                xp_gained: data?.xp_gained ?? data?.xp_ganho,
                leveled_up: data?.leveled_up ?? data?.subiu_level,
                new_level: data?.new_level ?? data?.novo_level,
                conquista_titulo: data?.titulo,
                conquista_descricao: data?.descricao,
              },
            })
          );
        }

      } catch {}

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}