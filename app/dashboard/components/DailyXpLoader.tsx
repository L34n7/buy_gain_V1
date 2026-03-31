"use client";

import { useEffect, useRef } from "react";

export default function DailyXpLoader() {
  const alreadyCalledRef = useRef(false);

  useEffect(() => {
    if (alreadyCalledRef.current) return;
    alreadyCalledRef.current = true;

    async function gerarXpDiario() {
      try {
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
                daily_xp: true,
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