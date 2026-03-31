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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [totalPoints, setTotalPoints] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const pathname = usePathname();

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
          setUserName(data.profile.nickname ?? data.profile.name ?? "Usuário");
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

  return (
    <main className={`dashboard-root ${isGuest === true ? "guest-layout" : ""}`}>
      <div className="dashboard-background" aria-hidden />

      {/* Globais SEMPRE montados */}
      <GlobalXpInterceptor />
      <GlobalXpSystem />

      {/* Só logado */}
      {authChecked && isGuest === false && (
        <>
          <DailyXpLoader />
          <GlobalAvaliacaoPopup />
        </>
      )}

      {authChecked && isGuest === false && (
        <Sidebar
          open={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <div className={`dashboard-main ${isGuest === true ? "guest-main" : ""}`}>
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

        {authChecked && isGuest === false && <MobileNav />}
      </div>
    </main>
  );
}