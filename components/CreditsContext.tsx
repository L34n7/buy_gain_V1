// components/CreditsContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type CreditsContextValue = {
  credits: number;
  setCredits: (v: number) => void;
  addCredits: (v: number) => void;
};

const CreditsContext = createContext<CreditsContextValue | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("credits");
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("credits", String(credits));
    } catch {}
  }, [credits]);

  const addCredits = (v: number) => {
    setCredits((c) => c + v);
  };

  return (
    <CreditsContext.Provider value={{ credits, setCredits, addCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}
