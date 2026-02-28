// app/ajuda/page.tsx

import Link from "next/link";
import "./ajuda.css";

export default function AjudaPage() {
  return (
<div className="ajuda-root">
  <div className="dashboard-container">
      <div className="ajuda-card">
        <h1>Central de Ajuda</h1>
        <p>
          Precisa de suporte? Estamos aqui para ajudar você 🚀
        </p>

        <div className="ajuda-buttons">
          <a
            href="https://wa.me/5531999999999?text=Olá,%20preciso%20de%20ajuda%20no%20BuyGain"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            💬 Falar no WhatsApp
          </a>

          <Link href="/">
            <span className="btn-voltar">Voltar para o início</span>
          </Link>
        </div>
      </div>
    </div>
        </div>

  );
}