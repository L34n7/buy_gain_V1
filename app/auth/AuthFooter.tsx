"use client";

import "./auth-footer.css";
import Link from "next/link";

export default function AuthFooter() {
  return (
    <footer className="auth-footer">
      <div className="auth-footer-content">

        <div className="auth-footer-left">

          <div className="auth-footer-brand">
            <img src="/logo.png" alt="BuyGain" 
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
              />
            <h4>BuyGain</h4>
          </div>

          <p>
            Transformamos suas compras online em pontos para trocar
            por gift cards e outras recompensas.
          </p>

          <div className="auth-footer-badges">
            <span>🔐 Ambiente Seguro</span>
            <span>🛡 Proteção de Dados (LGPD)</span>
          </div>

        </div>

        <div className="auth-footer-links">
          <Link href="/politica-de-privacidade">
            Política de Privacidade
          </Link>

          <Link href="/termos-de-uso">
            Termos de Uso
          </Link>

          <Link     
          href="https://wa.me/5531999999999?text=Olá,%20preciso%20de%20ajuda%20no%20BuyGain"
          target="_blank"
          rel="noopener noreferrer">
            Suporte
          </Link>
        </div>

        <div className="auth-footer-social">
          <p>Siga-nos</p>
          <div className="social-icons">
            <a 
              href="https://www.instagram.com/buy_gain" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <img src="/icons/MS/insta.png" alt="Instagram" />
            </a>

            <a 
              href="https://www.youtube.com/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <img src="/icons/MS/youtube.png" alt="YouTube" />
            </a>
          </div>
        </div>

      </div>

      <div className="auth-footer-copy">
        © {new Date().getFullYear()} BuyGain. Todos os direitos reservados.
      </div>
    </footer>
  );
}