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
  setReward(false);
  setRewardSuccess(false);
  setRewardStep("idle");
  setDisplayCount(0);
  onSubmit();
};

const [displayCount, setDisplayCount] = useState(0);
const [rewardStep, setRewardStep] = useState<"idle" | "link" | "cupom">("idle");

useEffect(() => {
  if (!buscaExecutada) return;

  if (!loading && !loadingCupons) {

    /* 1️⃣ mostra LINK RASTREADO */
    setRewardStep("link");
    setReward(true);

    // ripple depois do chacoalhar
    const rippleTimer = setTimeout(() => {
      setRewardSuccess(true);
    }, 1000);

    /* 2️⃣ depois de 15 segundos mostra CUPOM */
    const timer1 = setTimeout(() => {
      setRewardStep("cupom");
      setRewardSuccess(true);
    }, 7000);

    /* 3️⃣ depois de mais 20 segundos começa a remover efeito */
    const timer2 = setTimeout(() => {
      setReward(false);
    }, 14000);

    /* 4️⃣ finaliza e volta botão normal */
    const timer3 = setTimeout(() => {
      setRewardSuccess(false);
      setBuscaExecutada(false);
      setRewardStep("idle");
      setDisplayCount(0);
    }, 14500);

    return () => {
      clearTimeout(rippleTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }

}, [loading, loadingCupons, buscaExecutada]);


/* animação do contador */
useEffect(() => {
  if (rewardStep !== "cupom") return;
  if ((cuponsCount ?? 0) <= 0) return;

  let current = 0;

  const interval = setInterval(() => {
    current++;
    setDisplayCount(current);

    if (current >= (cuponsCount ?? 0)) {
      clearInterval(interval);
    }
  }, 120);

  return () => clearInterval(interval);
}, [rewardStep, cuponsCount]);


useEffect(() => {
  if (!error) return;

  setReward(false);
  setRewardSuccess(false);
  setBuscaExecutada(false);
  setRewardStep("idle");
  setDisplayCount(0);
}, [error]);



  return (
    <>
      <h2 className="dashboard-title">
        COLE SEU LINK DE COMPRA E GANHE RECOMPENSAS!
      </h2>

      <p className="dashboard-subtitle">
        Cole o link, busque por cupons e finalize a compra através do link
        rastreado para pontuar
      </p>

      <div className="dashboard-lojas">
        <p>
        <span>Lojas Disponiveis: </span>
         • Mercado Livre • Shopee
        </p>
      </div>

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
              Cole aqui o link da sua compra e clique em gerar
            </div>

          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);

              setReward(false);
              setRewardSuccess(false);
              setBuscaExecutada(false);
              setRewardStep("idle");
              setDisplayCount(0);
            }}
            placeholder="https://marketplace/produto"
            className="hero-input"
            aria-label="Link do produto"
          />

          <button
            className={`hero-cta ${
              error
                ? "btn-error"
                : `
                  ${(loading || loadingCupons) ? "scanner-active" : ""} 
                  ${reward ? "reward-active" : ""} 
                  ${rewardSuccess ? "reward-success" : ""}
                  ${rewardStep === "link" ? "reward-link" : ""}
                  ${rewardStep === "cupom" && cuponsCount > 0 ? "reward-cupom" : ""}
                  ${rewardStep === "cupom" && cuponsCount === 0 ? "reward-no-cupom" : ""}
                `
            }`}
            type="button"
            onClick={handleClick}
            disabled={(loading || loadingCupons || (reward && !error))}
          >
          <span className="btn-text">
            {error
              ? `❌ ${error}`
              : (loading || loadingCupons)
                ? "ESCANEANDO OFERTAS..."
                : rewardStep === "link"
                  ? "✅ LINK RASTREADO GERADO COM SUCESSO!"
                  : rewardStep === "cupom"
                    ? cuponsCount === 0
                      ? "😕 NENHUM CUPOM ENCONTRADO"
                      : `🎟️ ${displayCount} CUPOM${displayCount > 1 ? "S" : ""} ENCONTRADO${displayCount > 1 ? "S" : ""}`
                    : "GERAR LINK RASTREADO E CUPONS"}
          </span>

            <span className="scanner-line"></span>

            {rewardSuccess && !error && <span className="energy-ripple"></span>}
          </button>

          </div>
        </div>
      </div>
    </>
  );
}
