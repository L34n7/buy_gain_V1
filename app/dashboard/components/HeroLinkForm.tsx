"use client";

import React, { useEffect, useState } from "react";

type Props = {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  loadingCupons: boolean;
  cuponsCount?: number;
  error: string | null;
  setError: (v: string | null) => void;
  onSubmit: () => void;
  isGuest: boolean;
};

function getFriendlyError(error: string | null) {
  if (!error) return null;

  const normalized = error
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/sem comiss[aã]o|comiss[aã]o detect/i.test(normalized)) {
    return "Não conseguimos identificar a comissão deste produto. Tente novamente ou use outro anúncio do mesmo produto.";
  }

  if (/compartilhar/i.test(normalized)) {
    return "Não conseguimos abrir o compartilhamento deste produto. Tente novamente em alguns segundos.";
  }

  if (/link rastreado/i.test(normalized)) {
    return "Não conseguimos capturar o link rastreado deste produto. Tente novamente em alguns segundos.";
  }

  if (/preço inválido|preco invalido/i.test(normalized)) {
    return "Não conseguimos identificar o preço deste produto. Tente outro anúncio ou tente novamente.";
  }

  if (/Erro automação ML|Erro automacao ML|ML\]/i.test(normalized)) {
    return "Não conseguimos gerar o link deste produto agora. Tente novamente em alguns segundos.";
  }

  if (normalized.length > 180) {
    return "Ocorreu um erro ao gerar o link. Tente novamente em alguns segundos.";
  }

  return normalized;
}

export default function HeroLinkForm({
  url,
  setUrl,
  loading,
  loadingCupons,
  cuponsCount = 0,
  error,
  setError,
  onSubmit,
  isGuest,
}: Props) {
  const [reward, setReward] = useState(false);
  const [rewardSuccess, setRewardSuccess] = useState(false);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [rewardStep, setRewardStep] = useState<"idle" | "link" | "cupom">("idle");

  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const friendlyError = getFriendlyError(error);

  const handleClick = () => {
    setBuscaExecutada(true);
    setReward(false);
    setRewardSuccess(false);
    setRewardStep("idle");
    setDisplayCount(0);
    onSubmit();
  };

  useEffect(() => {
    if (!buscaExecutada) return;

    if (!loading && !loadingCupons) {
      /* 1️⃣ mostra LINK RASTREADO */
      setRewardStep("link");
      setReward(true);

      const rippleTimer = setTimeout(() => {
        setRewardSuccess(true);
      }, 1000);

      /* 2️⃣ depois mostra CUPOM */
      const timer1 = setTimeout(() => {
        setRewardStep("cupom");
        setRewardSuccess(true);
      }, 7000);

      /* 3️⃣ depois remove efeito */
      const timer2 = setTimeout(() => {
        setReward(false);
      }, 14000);

      /* 4️⃣ finaliza */
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

  const handlePaste = async () => {
    try {
      setPasteLoading(true);
      setPasteSuccess(false);

      const text = await navigator.clipboard.readText();

      if (!text) {
        setError("Nada encontrado para colar");
        return;
      }

      setUrl(text);
      if (error) setError(null);

      setReward(false);
      setRewardSuccess(false);
      setBuscaExecutada(false);
      setRewardStep("idle");
      setDisplayCount(0);

      setPasteSuccess(true);

      setTimeout(() => {
        setPasteSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Não foi possível acessar a área de transferência");
    } finally {
      setPasteLoading(false);
    }
  };

  return (
    <>
      <h2 className="dashboard-title">
        {isGuest
          ? "BUSQUE POR CUPONS COM O LINK DE COMPRA!"
          : "COLE SEU LINK DE COMPRA E GANHE RECOMPENSAS!"}
      </h2>

      <p className="dashboard-subtitle">
        {isGuest
          ? "Busque por cupons compativeis com a sua comprar de forma otimizada e acertiva"
          : "Cole o link, busque por cupons e finalize a compra através do link rastreado para pontuar"}
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
                <img src="/icons/convert.png" alt="Link" />
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-label">
                Cole aqui o link da sua compra e clique em Buscar cupons
            </div>

            <div className="hero-input-shell">
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
                type="button"
                className={`hero-paste-inline-btn ${pasteSuccess ? "pasted" : ""}`}
                onClick={handlePaste}
                disabled={pasteLoading}
                aria-label="Colar link"
              >
                {pasteSuccess ? "Colado" : "Colar"}
              </button>
            </div>

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
              disabled={loading || loadingCupons || (reward && !error)}
              title={error ? getFriendlyError(error) ?? undefined : undefined}
            >
              <span className="btn-text">
                {error
                  ? `❌ ${friendlyError}`
                  : (loading || loadingCupons)
                    ? "ESCANEANDO OFERTAS..."
                    : rewardStep === "link"
                      ? "✅ LINK RASTREADO GERADO COM SUCESSO!"
                      : rewardStep === "cupom"
                        ? cuponsCount === 0
                          ? "😕 NENHUM CUPOM ENCONTRADO"
                          : `🎟️ ${displayCount} CUPOM${displayCount > 1 ? "S" : ""} ENCONTRADO${displayCount > 1 ? "S" : ""}`
                        : isGuest
                          ? "BUSCAR CUPONS"
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
