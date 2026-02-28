"use client";

import React from "react";

type Props = {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
};

export default function HeroLinkForm({
  url,
  setUrl,
  loading,
  error,
  onSubmit,
}: Props) {
  return (
    <>
      <h2 className="dashboard-title">
        COLE SEU LINK E GANHE RECOMPENSAS!
      </h2>

      <p className="dashboard-subtitle">
        Cole o link e finalize a compra através do link
        rastreado para pontuar.
      </p>

      {/* HERO CARD */}
      <div className="hero-card">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-icon-wrap">
              <div className="hero-icon">
                <img
                  src="/icons/convert.png"
                  alt="Link"
                />
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-label">
              Cole aqui o link da sua compra
            </div>

            <input
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
              placeholder="https://marketplace/produto"
              className="hero-input"
              aria-label="Link do produto"
            />

            <div className="hero-cta-wrap">
              <button
                className="hero-cta"
                type="button"
                onClick={onSubmit}
                disabled={loading}
              >
                {loading
                  ? "GERANDO..."
                  : "BUSCAR CUPONS"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ERRO */}
      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}
    </>
  );
}
