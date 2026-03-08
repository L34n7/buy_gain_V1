"use client";

import { useEffect } from "react";

export default function DailyXpLoader() {
  useEffect(() => {
    async function gerarXpDiario() {
      try {
        // evita rodar múltiplas vezes na mesma sessão

        const res = await fetch("/api/xp/daily-login", {
          method: "POST",
        });

        if (!res.ok) return;

        const json = await res.json();

        if (json.gained) {
          window.dispatchEvent(
            new CustomEvent("xp:updated", {
              detail: {
                xp_gained: json.xp_gained,
                leveled_up: json.leveled_up,
                new_level: json.new_level,
              },
            })
          );
        }

      } catch (err) {
        console.error("Erro XP diário:", err);
      }
    }

    gerarXpDiario();
  }, []);

  return null;
}
