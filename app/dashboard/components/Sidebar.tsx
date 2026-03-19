"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useNotifications } from "./NotificationsContext";
import { useEffect, useState } from "react";
import "./sidebar.css";
import { APP_VERSION } from "@/lib/appConfig";


export default function Sidebar({
  open,
  onToggleSidebar,
}: {
  open: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const { eventosPendentes, notificacoesRecompensa } = useNotifications();

  const [Admin, setAdmin] = useState(false);

useEffect(() => {
  async function checkAdmin() {
    const res = await fetch("/api/auth/resolve", {
      credentials: "include",
    });

    const json = await res.json();
    if (res.ok && json.admin) {
      setAdmin(true);
    }
  }

  checkAdmin();
}, []);

  function isActive(path: string) {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <aside className={`dashboard-sidebar ${open ? "open" : "collapsed"}`}>
      <div className="sidebar-top">
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Abrir ou fechar menu"
        >
          ☰
        </button>
      </div>

      <nav className="sidebar-nav">
        <Link
          href="/dashboard"
          className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          <span className="nav-ico">🏠</span>
          <span className="nav-text">Início</span>
        </Link>

        <Link
          href="/dashboard/historico"
          className={`nav-item ${isActive("/dashboard/historico") ? "active" : ""}`}
        >
          <span className="nav-ico">🕘</span>
          <span className="nav-text">Histórico</span>
        </Link>

        <Link
        href="/dashboard/compras"
        className={`nav-item ${isActive("/dashboard/compras") ? "active" : ""}`}
      >
        <span className="nav-ico">🛒</span>
        <span className="nav-text">Compras</span>

        {eventosPendentes.length > 0 && (
          <span className="nav-badge">
            {eventosPendentes.length}
          </span>
        )}
        </Link>

        <Link
          href="/dashboard/extrato"
          className={`nav-item ${isActive("/dashboard/extrato") ? "active" : ""}`}
        >
          <span className="nav-ico">🧾</span>
          <span className="nav-text">Extrato</span>
        </Link>


        <Link
          href="/dashboard/recompensas"
          className={`nav-item ${isActive("/dashboard/recompensas") ? "active" : ""}`}
        >
          <span className="nav-ico">🎁</span>
          <span className="nav-text">Recompensas</span>
        </Link>

        <Link
          href="/dashboard/inventario"
          className={`nav-item ${isActive("/dashboard/inventario") ? "active" : ""}`}
        >
          <span className="nav-ico">🎒</span>
          <span className="nav-text">Inventário</span>

          {notificacoesRecompensa.length > 0 && (
            <span className="nav-badge">
              {notificacoesRecompensa.length}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard/missoes"
          className={`nav-item ${isActive("/dashboard/missoes") ? "active" : ""}`}
        >
          <span className="nav-ico">🎯</span>
          <span className="nav-text">Missões</span>
        </Link>

      {Admin && (
        <>
          <Link
            href="/dashboard/admin/resgates"
            className={`nav-item ${
              isActive("/dashboard/admin/resgates") ? "active" : ""
            }`}
          >
            <span className="nav-ico">🗡</span>
            <span className="nav-text">Resgates ADMIN</span>
          </Link>

          <Link
            href="/dashboard/admin/chamados"
            className={`nav-item ${
              isActive("/dashboard/admin/chamados") ? "active" : ""
            }`}
          >
            <span className="nav-ico">💻</span>
            <span className="nav-text">Chamados ADMIN</span>
          </Link>
        </>
      )}

      
      </nav>
      <div className="sidebar-footer">{APP_VERSION}</div>
    </aside>
  );
}
