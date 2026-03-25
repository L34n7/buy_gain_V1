"use client";

import { useEffect, useState } from "react";
import "./global-xp.css";

type XpEvent = {
  xp_gained: number;
  leveled_up?: boolean;
  new_level?: number;
  conquistas?: any[];
};

export default function GlobalXpSystem() {
  const [xpQueue, setXpQueue] = useState<number[]>([]);
  const [xpPopup, setXpPopup] = useState<number | null>(null);  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelUnlocked, setLevelUnlocked] = useState<number | null>(null);

  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState<string | null>(null);
  const [achievementDescription, setAchievementDescription] = useState<string | null>(null);
  
  // 🔥 FILA DE CONQUISTAS
  const [achievementQueue, setAchievementQueue] = useState<any[]>([]);

  useEffect(() => {
  function handleXpEvent(e: Event) {
    const event = e as CustomEvent<any>;
    const data = event.detail;

    if (!data) return;

    // ==========================
    // XP NORMAL
    // ==========================
    if (data.xp_gained) {
      setXpQueue(prev => [...prev, data.xp_gained]);
    }

    // ==========================
    // 🔥 CONQUISTA INDIVIDUAL
    // ==========================
    if (data.conquista_titulo) {
      setAchievementQueue(prev => [
        ...prev,
        {
          titulo: data.conquista_titulo,
          descricao: data.conquista_descricao
        }
      ]);
    }

    // ==========================
    // 🔥 CONQUISTAS (ARRAY)
    // ==========================
    if (Array.isArray(data.conquistas)) {
      setAchievementQueue(prev => [
        ...prev,
        ...data.conquistas
      ]);
    }

    // ==========================
    // LEVEL UP
    // ==========================
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
  }, 100); // pequeno delay só para garantir layout final

  return () => clearTimeout(timer);
}, [showLevelModal]);


  // PROCESSADOR FILA DE XP
  useEffect(() => {
    if (!xpPopup && !showAchievement && !showLevelModal && xpQueue.length > 0) {
      const nextXp = xpQueue[0];

      setXpPopup(nextXp);

      setTimeout(() => {
        setXpPopup(null);
        setXpQueue(prev => prev.slice(1));
      }, 3500); // mesmo tempo da conquista
    }
  }, [xpQueue, xpPopup, showAchievement, showLevelModal]);


  // 🔥 PROCESSADOR DA FILA
  useEffect(() => {
    if (!showAchievement && achievementQueue.length > 0) {
      const next = achievementQueue[0];

      setAchievementTitle(next.titulo);
      setAchievementDescription(next.descricao);
      setShowAchievement(true);

      setTimeout(() => {
        setShowAchievement(false);
        setAchievementQueue(prev => prev.slice(1));
      }, 3500);
    }
  }, [achievementQueue, showAchievement]);

  // EFEITO CONFETE LEVEL UP

  async function shootConfetti() {
    if (typeof window === "undefined") return;

    const canvas = document.getElementById(
      "level-confetti-canvas"
    ) as HTMLCanvasElement;

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
      {/* XP pequeno */}
      {xpPopup && (
        <div className="xp-popup">
          <span>+{xpPopup} XP</span>
        </div>
      )}

      {/* CONQUISTAS EM FILA */}
      {showAchievement && achievementTitle && (
        <div className="achievement-popup">
          <div className="achievement-card">
            <div className="achievement-icon">🏆</div>
            <div>
              <strong>{achievementTitle}</strong>
              <p>{achievementDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CENTRAL PREMIUM */}
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
              +10% de pontuação extra em todas as compras por 3 dias
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