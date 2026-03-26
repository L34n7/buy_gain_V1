"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./dashboard.css";
import MobileNav from "./components/MobileNav";
import AuthFooter from "../auth/AuthFooter";
import { usePathname } from "next/navigation";
import DailyXpLoader from "./components/DailyXpLoader";
import GlobalXpInterceptor from "./components/GlobalXpInterceptor";
import GlobalXpSystem from "./components/GlobalXpSystem";
import GlobalAvaliacaoPopup from "./components/GlobalAvaliacaoPopup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* --------------------------
     STATES
  ---------------------------*/
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [totalPoints, setTotalPoints] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // NOVO: controle de autenticação
  const [isGuest, setIsGuest] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const pathname = usePathname();

  /* -----------------------------------------------------
     BUSCAR DADOS DO USUÁRIO
     Se não estiver logado, entra em modo visitante
  ----------------------------------------------------- */
  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
        });

        if (!res.ok) {
          setIsGuest(true);
          setUserName("Visitante");
          setAvatarUrl(null);
          setTotalPoints(0);
          return;
        }

        const data = await res.json();

        if (data?.profile) {
          setUserName(
            data.profile.nickname ??
              data.profile.name ??
              "Usuário"
          );

          setAvatarUrl(data.profile.avatar_url ?? null);
          setIsGuest(false);
        } else {
          setIsGuest(true);
          setUserName("Visitante");
          setAvatarUrl(null);
          setTotalPoints(0);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setIsGuest(true);
        setUserName("Visitante");
        setAvatarUrl(null);
        setTotalPoints(0);
      } finally {
        setAuthChecked(true);
      }
    }

    loadUserData();
  }, []);

  /* --------------------------
     RENDER
  ---------------------------*/
  return (
    <main className={`dashboard-root ${isGuest ? "guest-layout" : ""}`}>
      <div className="dashboard-background" aria-hidden />

      {/* SIDEBAR: só aparece se estiver logado */}
      {authChecked && !isGuest && (
        <Sidebar
          open={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <div className={`dashboard-main ${isGuest ? "guest-main" : ""}`}>
        {/* COMPONENTES GLOBAIS PRIVADOS: só logado */}
        {authChecked && !isGuest && (
          <>
            <DailyXpLoader />
            <GlobalXpInterceptor />
            <GlobalXpSystem />
            <GlobalAvaliacaoPopup />
          </>
        )}

        <Header
          userName={userName}
          avatarUrl={avatarUrl}
          points={totalPoints}
          isGuest={isGuest}
        />

        <div key={pathname} className="dashboard-content fade-wrapper">
          {children}
        </div>

        <AuthFooter />

        {/* MENU MOBILE: só logado */}
        {authChecked && !isGuest && <MobileNav />}
      </div>
    </main>
  );
}