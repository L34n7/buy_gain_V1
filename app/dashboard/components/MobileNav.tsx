"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import "./mobile-nav.css";

export default function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(path: string) {
    return pathname === path;
  }

  // 🔥 Fecha automaticamente quando mudar de rota
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* MENU EXPANDIDO */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/dashboard/extrato">
              📊 Extrato
            </Link>

            <Link href="/dashboard/historico">
              🕘 Histórico
            </Link>

            <Link href="/dashboard/inventario">
              🎒 Inventário
            </Link>

            <Link href="/dashboard/missoes">
              🎯 Missões
            </Link>
          </div>
        </div>
      )}

      {/* NAV FIXO */}
      <nav className="mobile-nav">
        <Link
          href="/dashboard"
          className={`mobile-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          🏠
          <span>Home</span>
        </Link>

        <Link
          href="/dashboard/compras"
          className={`mobile-item ${
            isActive("/dashboard/compras") ? "active" : ""
          }`}
        >
          🛒
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
          className="mobile-item"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}