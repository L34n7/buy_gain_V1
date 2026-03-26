"use client";

import React from "react";
import { shortenLink, formatCurrency } from "../utils/format";

type Props = {
  trackedLink: string | null;

  produtoNome: string | null;
  produtoImagem: string | null;
  valor: number | null;
  pontos: number | null;

  pointsMin: number | null;
  pointsMax: number | null;

  copyMessage: string | null;
  isGuest: boolean;

  onCopy: () => void;
  onOpen: () => void;
};

export default function ResultCard({
  trackedLink,
  produtoNome,
  produtoImagem,
  valor,
  pontos,
  pointsMin,
  pointsMax,
  copyMessage,
  isGuest,
  onCopy,
  onOpen,
}: Props) {
  if (!trackedLink) return null;

  const pontosExibidos = pontos ?? 0;
  const estimativaTexto = pontosExibidos
    ? `${pointsMin ?? Math.floor(pontosExibidos * 0.8)} – ${pontosExibidos} pontos`
    : "calculando...";

  return (
    <div className="result-premium" role="region" aria-live="polite">
      {/* TOAST */}
      {copyMessage && <div className="toast-popup">{copyMessage}</div>}

      {/* REWARD */}
      <div className={`result-reward ${isGuest ? "guest-cta" : ""}`}>
        <div className="result-left">
          <div className="result-icon">{"💎"}</div>

          <div className="result-text">
            {isGuest ? (
              <>
                <div className="result-line guest">
                  Você pode ganhar até{" "}
                  <strong>{pontosExibidos} pontos</strong> nesta compra, faça login ou crie sua conta agora gratis!
                </div>

                <div className="result-sub guest">
                  Faça login ou crie sua conta para <strong>não perder essa recompensa</strong>
                </div>

                <div className="result-sub-cta">
                  Sem cadastro você pode gerar o link, mas{" "}
                  <strong>não recebe os pontos</strong> e não acompanha o status
                  da compra.
                </div>
              </>
            ) : (
              <>
                <div className="result-line">
                  Você pode ganhar até <strong>{pontosExibidos} pontos</strong>{" "}
                  ao finalizar a compra
                </div>

                <div className="result-sub">
                  Estimativa: {estimativaTexto}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CARD */}
      <div className="result-card">
        {/* IMAGEM */}
        <div className="result-thumb">
          <img
            src={produtoImagem || "/images/product-placeholder.png"}
            alt="Produto"
          />
        </div>

        {/* INFO */}
        <div className="result-info">
          <div className="result-progress-bar">
            <div
              className="result-progress-fill"
              style={{
                width: "100%",
              }}
            />
          </div>

          <div className="result-title">
            {produtoNome ?? "Produto desconhecido"}
          </div>

          <div className="result-meta">
            <div className="price">
              Preço:{" "}
              <strong>
                {valor !== null ? formatCurrency(valor) : "—"}
              </strong>
            </div>

            <div className="points">
              Pontos: <strong>{pontos ?? "—"}</strong>
            </div>
          </div>

          {/* LINK */}
          <div className="result-link-row">
            <div className="result-link-short" title={trackedLink}>
              {shortenLink(trackedLink)}
            </div>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="result-actions">
          <button className="btn btn-open" onClick={onOpen}>
            <span className="btn-main">Abrir</span>
            <span className="btn-sub">Link Rastreado</span>
          </button>

          <button className="btn btn-copy" onClick={onCopy}>
            <span className="btn-main">Copiar</span>
          </button>
        </div>
      </div>
    </div>
  );
}