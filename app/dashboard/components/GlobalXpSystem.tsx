"use client";

import { useEffect, useState } from "react";
import "./global-xp.css";

type XpEvent = {
  xp_gained?: number;
  daily_xp?: boolean;
  leveled_up?: boolean;
  new_level?: number;
  conquistas?: any[];
  conquista_titulo?: string;
  conquista_descricao?: string;
};

export default function GlobalXpSystem() {
  const [xpQueue, setXpQueue] = useState<number[]>([]);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelUnlocked, setLevelUnlocked] = useState<number | null>(null);

  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState<string | null>(null);
  const [achievementDescription, setAchievementDescription] = useState<string | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<any[]>([]);

  const [showDailyXpPopup, setShowDailyXpPopup] = useState(false);
  const [dailyXpAmount, setDailyXpAmount] = useState<number | null>(null);
  const [dailyXpQueue, setDailyXpQueue] = useState<number[]>([]);

  useEffect(() => {
    function handleXpEvent(e: Event) {
      const event = e as CustomEvent<any>;
      const data = event.detail;

      if (!data) return;

      // XP diário vai para fila separada
      if (typeof data.xp_gained === "number") {
        if (data.daily_xp === true) {
          setDailyXpQueue((prev) => [...prev, data.xp_gained]);
        } else {
          setXpQueue((prev) => [...prev, data.xp_gained]);
        }
      }

      // conquista individual
      if (data.conquista_titulo) {
        setAchievementQueue((prev) => [
          ...prev,
          {
            titulo: data.conquista_titulo,
            descricao: data.conquista_descricao,
          },
        ]);
      }

      // múltiplas conquistas
      if (Array.isArray(data.conquistas) && data.conquistas.length > 0) {
        setAchievementQueue((prev) => [...prev, ...data.conquistas]);
      }

      // level up
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

  // =================================
  // XP PEQUENO NORMAL (conquistas etc)
  // =================================
  useEffect(() => {
    if (xpPopup === null && xpQueue.length > 0) {
      setXpPopup(xpQueue[0]);
    }
  }, [xpQueue, xpPopup]);

  useEffect(() => {
    if (xpPopup === null) return;

    const timer = setTimeout(() => {
      setXpPopup(null);
      setXpQueue((prev) => prev.slice(1));
    }, 3500);

    return () => clearTimeout(timer);
  }, [xpPopup]);

  // =================================
  // CARD DE CONQUISTAS
  // =================================
  useEffect(() => {
    if (
      !showAchievement &&
      !showDailyXpPopup &&
      !showLevelModal &&
      achievementQueue.length > 0
    ) {
      const next = achievementQueue[0];

      setAchievementTitle(next.titulo);
      setAchievementDescription(next.descricao);
      setShowAchievement(true);
    }
  }, [achievementQueue, showAchievement, showDailyXpPopup, showLevelModal]);

  useEffect(() => {
    if (!showAchievement) return;

    const timer = setTimeout(() => {
      setShowAchievement(false);
      setAchievementTitle(null);
      setAchievementDescription(null);
      setAchievementQueue((prev) => prev.slice(1));
    }, 3500);

    return () => clearTimeout(timer);
  }, [showAchievement]);

  // =================================
  // CARD LOGIN DIÁRIO
  // Só abre depois que acabarem conquistas
  // =================================
  useEffect(() => {
    if (
      !showDailyXpPopup &&
      !showAchievement &&
      !showLevelModal &&
      achievementQueue.length === 0 &&
      dailyXpQueue.length > 0
    ) {
      setDailyXpAmount(dailyXpQueue[0]);
      setShowDailyXpPopup(true);
    }
  }, [
    dailyXpQueue,
    showDailyXpPopup,
    showAchievement,
    showLevelModal,
    achievementQueue.length,
  ]);

  useEffect(() => {
    if (!showDailyXpPopup) return;

    const timer = setTimeout(() => {
      setShowDailyXpPopup(false);
      setDailyXpAmount(null);
      setDailyXpQueue((prev) => prev.slice(1));
    }, 3500);

    return () => clearTimeout(timer);
  }, [showDailyXpPopup]);

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
      {/* XP pequeno normal */}
      {xpPopup !== null && (
        <div className="xp-popup">
          <span>+{xpPopup} XP</span>
        </div>
      )}

      {/* Card login diário + XP pequeno diário juntos no final */}
      {showDailyXpPopup && dailyXpAmount !== null && (
        <>
          <div className="xp-popup">
            <span>+{dailyXpAmount} XP</span>
          </div>

          <div className="achievement-popup">
            <div className="achievement-card daily-xp-card">
              <div className="achievement-icon">⚡</div>
              <div>
                <strong>XP Diário Recebido!</strong>
                <p>Você ganhou +{dailyXpAmount} XP pelo login de hoje.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Card conquista */}
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

      {/* Level up */}
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