"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./intermediary.css";
import AuthFooter from "./auth/AuthFooter";


export default function EntrarPage() {
    const router = useRouter();
    const [faded, setFaded] = useState(false);
    const [logoFaded, setLogoFaded] = useState(false);

    useEffect(() => {
    const timer = setTimeout(() => setLogoFaded(true), 2200);
    return () => clearTimeout(timer);
    }, []);

return (
  <div className="auth-page">

    <div className="login-logo-wrapper">
      <img
        src="/logo.png"
        alt="BuyGain"
        className={`login-logo ${logoFaded ? "faded" : ""}`}
        draggable="false"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>

    <div className="intro-page">

      <header className="intro-header">
        <h1 className="welcome-title">
          Seja Bem-vindo ao BuyGain
        </h1>

        <h2 className="intro-h1">
          Economize com cupons e ganhe recompensas nas suas compras online
        </h2>

        <p className="intro-sub">
        Encontre cupons compatíveis com sua compra, finalize o pedido pelo link rastreado
        e acumule pontos automaticamente. Conforme você sobe de nível na plataforma,
        passa a ganhar mais pontos em cada compra e pode trocar seus pontos por
        recompensas exclusivas.
        </p>

        <p className="intro-text">
          100% gratuito • Sem alterar sua forma de comprar • Compatível com
          Shopee e Mercado Livre
        </p>

      </header>

      {/* BOTÕES DIAGONAIS */}
      <div className="cta-area">
        <div className="cta-wrapper">

          <button
            className="cta-button cta-left"
            onClick={() => router.push("/auth/login")}
          >
            <span className="cta-legend">Entrar</span>
            <span className="cta-subtext">Já tenho conta</span>
          </button>

          <button
            className="cta-button cta-right"
            onClick={() => router.push("/auth/cadastro")}
          >
            <span className="cta-legend">Criar conta</span>
            <span className="cta-subtext">Cadastrar-se</span>
          </button>

        </div>
      </div>

    </div>

    <AuthFooter />
  </div>
);
}