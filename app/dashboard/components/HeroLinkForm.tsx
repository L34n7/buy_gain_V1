"use client";

import React, { useEffect, useState, useRef } from "react";

type Props = {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  loadingCupons: boolean;
  cuponsCount?: number;   
  error: string | null;
  setError: (v: string | null) => void;
  onSubmit: () => void;
};

export default function HeroLinkForm({
  url,
  setUrl,
  loading,
  loadingCupons,
  cuponsCount = 0,
  error,
  setError,
  onSubmit,
}: Props) {


const [reward, setReward] = useState(false);
const [rewardSuccess, setRewardSuccess] = useState(false);
const [buscaExecutada, setBuscaExecutada] = useState(false);
const handleClick = () => {
  setBuscaExecutada(true);
  onSubmit();
};
const [displayCount, setDisplayCount] = useState(0);

useEffect(() => {

  if (!buscaExecutada) return;

  if (!loading && !loadingCupons) {

    setReward(true);
    setRewardSuccess(true);

    setTimeout(() => {
      setReward(false);
    }, 8700);

    setTimeout(() => {
      setRewardSuccess(false);
      setBuscaExecutada(false);
    }, 8800);

  }

}, [loadingCupons]);

/* animação do contador */
useEffect(() => {

  if (!reward) return;

  let current = 0;

  const interval = setInterval(() => {

    current++;

    setDisplayCount(current);

    if (current >= (cuponsCount ?? 0)) {
      clearInterval(interval);
    }

  }, 120);

  return () => clearInterval(interval);

}, [reward, cuponsCount]);

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
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://marketplace/produto"
            className="hero-input"
            aria-label="Link do produto"
          />

          <button
            className={`hero-cta 
            ${(loading || loadingCupons) ? "scanner-active" : ""} 
            ${reward ? "reward-active" : ""} 
            ${rewardSuccess ? "reward-success" : ""}
            ${error ? "btn-error" : ""}
            `}
            type="button"
            onClick={handleClick}
            disabled={loading || loadingCupons || reward}
          >
          <span className="btn-text">
            {error
              ? `❌ ${error}`
              : (loading || loadingCupons)
                ? "ESCANEANDO OFERTAS..."
                : reward
                  ? cuponsCount === 0
                    ? "😕 NENHUM CUPOM ENCONTRADO"
                    : `🎟️ ${displayCount} CUPOM${displayCount > 1 ? "S" : ""} ENCONTRADO${displayCount > 1 ? "S" : ""}`
                  : "BUSCAR CUPONS"}
          </span>

            <span className="scanner-line"></span>

            {rewardSuccess && <span className="energy-ripple"></span>}
          </button>

          </div>
        </div>
      </div>
    </>
  );
}
