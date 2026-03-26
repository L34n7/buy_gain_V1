"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useNotifications } from "./NotificationsContext";
import { APP_VERSION } from "@/lib/appConfig";
import "./mobile-nav.css";

export default function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(false);

  const { eventosPendentes, notificacoesRecompensa } = useNotifications();

  function isActive(path: string) {
    // 👉 Caso especial: início
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === path || pathname.startsWith(path + "/");
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/resolve", {
          credentials: "include",
        });

        const json = await res.json();

        if (res.ok && json.admin) {
          setAdmin(true);
        } else {
          setAdmin(false);
        }
      } catch (error) {
        console.error("Erro ao verificar admin no mobile:", error);
        setAdmin(false);
      }
    }

    checkAdmin();
  }, []);

  function isMoreActive() {
    return (
      isActive("/dashboard/extrato") ||
      isActive("/dashboard/historico") ||
      isActive("/dashboard/inventario") ||
      isActive("/dashboard/missoes") ||
      isActive("/dashboard/admin")
    );
  }

  return (
    <>
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/dashboard/extrato"
              className={isActive("/dashboard/extrato") ? "active" : ""}
            >
              <span>🧾 Extrato</span>
            </Link>

            <Link
              href="/dashboard/historico"
              className={isActive("/dashboard/historico") ? "active" : ""}
            >
              <span>🕘 Histórico</span>
            </Link>

            <Link
              href="/dashboard/inventario"
              className={isActive("/dashboard/inventario") ? "active" : ""}
            >
              <span>🎒 Inventário</span>

              {notificacoesRecompensa.length > 0 && (
                <span className="mobile-menu-badge">
                  {notificacoesRecompensa.length}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/missoes"
              className={isActive("/dashboard/missoes") ? "active" : ""}
            >
              <span>🎯 Missões</span>
            </Link>

            {admin && (
              <>
                <Link
                  href="/dashboard/admin/resgates"
                  className={isActive("/dashboard/admin/resgates") ? "active" : ""}
                >
                  <span>🗡 Resgates - Admin</span>
                </Link>

                <Link
                  href="/dashboard/admin/chamados"
                  className={isActive("/dashboard/admin/chamados") ? "active" : ""}
                >
                  <span>💻 Chamados - Admin</span>
                </Link>
              </>
            )}

            <div className="mobile-menu-divider" />

            <div className="mobile-menu-version">
              {APP_VERSION}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-nav">
        <Link
          href="/dashboard"
          className={`mobile-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          🏠
          <span>Início</span>
        </Link>

        <Link
          href="/dashboard/compras"
          className={`mobile-item mobile-item-compras ${
            isActive("/dashboard/compras") ? "active" : ""
          }`}
        >
          🛒

          {eventosPendentes.length > 0 && (
            <span className="mobile-badge">
              {eventosPendentes.length}
            </span>
          )}

          <span>Compras</span>
        </Link>

        <Link
          href="/dashboard/recompensas"
          className={`mobile-item ${
            isActive("/dashboard/recompensas") ? "active" : ""
          }`}
        >
          🎁
          <span>Recompensas</span>
        </Link>

        <button
          type="button"
          className={`mobile-item mobile-item-more ${
            isMoreActive() ? "active" : ""
          }`}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰

          {notificacoesRecompensa.length > 0 && (
            <span className="mobile-dot"></span>
          )}

          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}