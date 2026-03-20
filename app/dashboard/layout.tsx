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
  const pathname = usePathname();


  /* -----------------------------------------------------
     BUSCAR DADOS DO USUÁRIO (NOVO MODELO - AUTH)
  ----------------------------------------------------- */
useEffect(() => {
  async function loadUserData() {
    try {
      const res = await fetch("/api/profile", {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data?.profile) {
        setUserName(
          data.profile.nickname ??
          data.profile.name ??
          "Usuário"
        );

        setAvatarUrl(data.profile.avatar_url ?? null);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  }

  loadUserData();
}, []);


  /* --------------------------
     RENDER
  ---------------------------*/
return (
  <main className="dashboard-root">
    <div className="dashboard-background" aria-hidden />

    <Sidebar
      open={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
    />

    <div className="dashboard-main">

      <DailyXpLoader />
      <GlobalXpInterceptor />
      <GlobalXpSystem />
      <GlobalAvaliacaoPopup />

      <Header
        userName={userName}
        avatarUrl={avatarUrl}
        points={totalPoints}
      />

      <div key={pathname} className="dashboard-content fade-wrapper">
        {children}
      </div>

      <AuthFooter />

      <MobileNav />
    </div>
  </main>
);
}
