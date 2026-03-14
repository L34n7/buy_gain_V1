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
  onCopy,
  onOpen,
}: Props) {
  if (!trackedLink) return null;

  return (
    <div className="result-premium" role="region" aria-live="polite">
      {/* TOAST */}
      {copyMessage && (
        <div className="toast-popup">
          {copyMessage}
        </div>
      )}

      {/* REWARD */}
      <div className="result-reward">
        <div className="reward-left">
          <div className="reward-icon">💎</div>

          <div className="reward-text">
            <div className="reward-line">
              Você pode ganhar até{" "}
              <strong>
                {pontos ?? 0} pontos
              </strong>{" "}
              ao finalizar a compra
            </div>

          <div className="reward-sub">
            Estimativa:{" "}
            {pontos
              ? `${pointsMin ?? Math.floor(pontos * 0.8)} – ${pontos} pontos`
              : "calculando..."}
          </div>
          </div>
        </div>
      </div>

      {/* CARD */}
      <div className="result-card">
        {/* IMAGEM */}
        <div className="result-thumb">
          <img
            src={
              produtoImagem ||
              "/images/product-placeholder.png"
            }
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
            {produtoNome ??
              "Produto desconhecido"}
          </div>

          <div className="result-meta">
            <div className="price">
              Preço:{" "}
              <strong>
                {valor !== null
                  ? formatCurrency(valor)
                  : "—"}
              </strong>
            </div>

            <div className="points">
              Pontos:{" "}
              <strong>
                {pontos ?? "—"}
              </strong>
            </div>
          </div>

          {/* LINK */}
          <div className="result-link-row"> 
            <div
              className="result-link-short"
              title={trackedLink}
            >
              {shortenLink(trackedLink)}
            </div>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="result-actions">
          <button
            className="btn btn-open"
            onClick={onOpen}
          >
            <span className="btn-main">
              Abrir
            </span>
            <span className="btn-sub">
              Link Rastreado
            </span>
          </button>

          <button
            className="btn btn-copy"
            onClick={onCopy}
          >
            <span className="btn-main">
              Copiar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
