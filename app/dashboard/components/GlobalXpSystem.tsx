"use client";

import { useEffect, useState } from "react";
import "./global-xp.css";

type AchievementItem = {
  titulo: string;
  descricao?: string | null;
};

type XpEvent = {
  xp_gained?: number;
  leveled_up?: boolean;
  new_level?: number;
  conquista_titulo?: string;
  conquista_descricao?: string;
  conquistas?: any[];
};

function normalizarConquista(item: any): AchievementItem | null {
  if (!item) return null;

  const titulo =
    item.titulo ||
    item.conquista_titulo ||
    item.title ||
    item.nome ||
    null;

  const descricao =
    item.descricao ||
    item.conquista_descricao ||
    item.description ||
    item.mensagem ||
    "";

  if (!titulo) return null;

  return {
    titulo: String(titulo),
    descricao: descricao ? String(descricao) : "",
  };
}

export default function GlobalXpSystem() {
  const [xpQueue, setXpQueue] = useState<number[]>([]);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelUnlocked, setLevelUnlocked] = useState<number | null>(null);

  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState<string | null>(null);
  const [achievementDescription, setAchievementDescription] = useState<string | null>(null);

  const [achievementQueue, setAchievementQueue] = useState<AchievementItem[]>([]);

  useEffect(() => {
    function handleXpEvent(e: Event) {
      const event = e as CustomEvent<XpEvent>;
      const data = event.detail;

      if (!data) return;

      // XP NORMAL
      const xpGained =
        typeof data.xp_gained === "number" && data.xp_gained > 0
          ? data.xp_gained
          : null;

      if (xpGained !== null) {
        setXpQueue((prev) => [...prev, xpGained]);
      }

      // CONQUISTA INDIVIDUAL
      if (data.conquista_titulo) {
        const conquista = normalizarConquista({
          titulo: data.conquista_titulo,
          descricao: data.conquista_descricao,
        });

        if (conquista) {
          setAchievementQueue((prev) => [...prev, conquista]);
        }
      }

      // ARRAY DE CONQUISTAS
      if (Array.isArray(data.conquistas) && data.conquistas.length > 0) {
        const novas = data.conquistas
          .map(normalizarConquista)
          .filter(Boolean) as AchievementItem[];

        if (novas.length > 0) {
          setAchievementQueue((prev) => [...prev, ...novas]);
        }
      }

      // LEVEL UP
      if (data.leveled_up && data.new_level) {
        setLevelUnlocked(data.new_level);

        setTimeout(() => {
          setShowLevelModal(true);
        }, 2000);
      }
    }

    window.addEventListener("xp:updated", handleXpEvent as EventListener);

    return () => {
      window.removeEventListener("xp:updated", handleXpEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!showLevelModal) return;

    const timer = setTimeout(() => {
      shootConfetti();
    }, 100);

    return () => clearTimeout(timer);
  }, [showLevelModal]);

  // FILA DE XP
  useEffect(() => {
    if (!xpPopup && !showAchievement && !showLevelModal && xpQueue.length > 0) {
      const nextXp = xpQueue[0];

      setXpPopup(nextXp);

      const timer = setTimeout(() => {
        setXpPopup(null);
        setXpQueue((prev) => prev.slice(1));
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [xpQueue, xpPopup, showAchievement, showLevelModal]);

  // FILA DE CONQUISTAS
  useEffect(() => {
    if (!showAchievement && !xpPopup && !showLevelModal && achievementQueue.length > 0) {
      const next = achievementQueue[0];

      setAchievementTitle(next.titulo);
      setAchievementDescription(next.descricao || "");
      setShowAchievement(true);

      const timer = setTimeout(() => {
        setShowAchievement(false);
        setAchievementQueue((prev) => prev.slice(1));
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [achievementQueue, showAchievement, xpPopup, showLevelModal]);

  async function shootConfetti() {
    if (typeof window === "undefined") return;

    const canvas = document.getElementById(
      "level-confetti-canvas"
    ) as HTMLCanvasElement | null;

    if (!canvas) return;

    await new Promise(requestAnimationFrame);

    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default ?? confettiModule;

      const myConfetti = confetti.create(canvas, {
        resize: false,
      });

      const duration = 2000;
      const end = Date.now() + duration;
      const colors = ["#8b3cf2", "#00fff5", "#ffffff", "#ffd700"];

      (function frame() {
        myConfetti({
          particleCount: 5,
          angle: 60,
          spread: 80,
          startVelocity: 60,
          origin: { x: 0, y: 0.65 },
          colors,
        });

        myConfetti({
          particleCount: 5,
          angle: 120,
          spread: 80,
          startVelocity: 60,
          origin: { x: 1, y: 0.65 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    } catch (err) {
      console.error("Erro confetti:", err);
    }
  }

  return (
    <>
      {xpPopup && (
        <div className="xp-popup">
          <span>+{xpPopup} XP</span>
        </div>
      )}

      {showAchievement && achievementTitle && (
        <div className="achievement-popup">
          <div className="achievement-card">
            <div className="achievement-icon">🏆</div>
            <div>
              <strong>{achievementTitle}</strong>
              {!!achievementDescription && <p>{achievementDescription}</p>}
            </div>
          </div>
        </div>
      )}

      {showLevelModal && levelUnlocked && (
        <div className="level-modal-overlay">
          <canvas
            id="level-confetti-canvas"
            className="level-confetti-canvas"
          />
          <div className="level-modal">
            <h2>🎉 Parabéns!</h2>

            <p>
              Você alcançou o <strong>Nível {levelUnlocked}</strong> e
              desbloqueou uma recompensa exclusiva:
            </p>

            <div className="level-reward">
              +5% de pontuação extra em todas as compras por 3 dias
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowLevelModal(false)}
            >
              Ativar bônus 🚀
            </button>
          </div>
        </div>
      )}
    </>
  );
}