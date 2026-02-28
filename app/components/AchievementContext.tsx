"use client";

import { createContext, useContext, useState } from "react";

type AchievementData = {
  titulo: string;
  descricao: string;
  xp_ganho: number;
  subiu_level?: boolean;
  novo_level?: number;
};

type AchievementContextType = {
  showAchievement: (data: AchievementData) => void;
};

const AchievementContext = createContext<AchievementContextType | null>(null);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [achievement, setAchievement] = useState<AchievementData | null>(null);

  function showAchievement(data: AchievementData) {
    setAchievement(data);
    setTimeout(() => setAchievement(null), 3500);
  }

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}

      {achievement && (
        <div className="achievement-popup">
          <div className="achievement-popup-content">
            <div className="achievement-icon">🏆</div>

            <h3>Nova Conquista!</h3>
            <strong>{achievement.titulo}</strong>
            <p>{achievement.descricao}</p>

            <div className="xp-reward">
              +{achievement.xp_ganho} XP
            </div>

            {achievement.subiu_level && (
              <div className="level-up">
                🚀 Level {achievement.novo_level} alcançado!
              </div>
            )}
          </div>
        </div>
      )}
    </AchievementContext.Provider>
  );
}

export function useAchievement() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error("useAchievement deve estar dentro de AchievementProvider");
  }
  return context;
}