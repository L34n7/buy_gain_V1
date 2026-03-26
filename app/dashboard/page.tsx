"use client";

import React, { useState, useEffect } from "react";
import "./dashboard.css";

import { statusExigeResposta } from "./utils/prazo";

import EventsModal from "../components/EventsModal";
import HeroLinkForm from "./components/HeroLinkForm";
import ResultCard from "./components/ResultCard";
import Link from "next/link";
import { emitirXpUpdate } from "@/lib/xpEmitter";

/* =====================================================
   page.tsx - Conteúdo da página Início
   Ajustado para funcionar em modo logado e visitante
===================================================== */

type EventoPendente = {
  id: string;
  status?: string;
  data_evento?: string;
  data_update?: string;
  link_rastreado?: string;

  produto_nome?: string;
  produto_imagem?: string;
  ganho_pontos?: number;
  produto_vendas?: number;
};

type LevelBonusData = {
  level_bonus_percent: number;
  level_bonus_started_at: string | null;
  level_bonus_expires_at: string | null;
  level_bonus_active: boolean;
};

export default function Home() {
  /* --------------------------
     STATES PRINCIPAIS
  ---------------------------*/
  const [url, setUrl] = useState<string>("");
  const [trackedLink, setTrackedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [produtoNome, setProdutoNome] = useState<string | null>(null);
  const [gain10, setGain10] = useState<number | null>(null);
  const [gain30, setGain30] = useState<number | null>(null);

  const [valor, setValor] = useState<number | null>(null);
  const [pontos, setPontos] = useState<number | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [userName, setUserName] = useState<string>("Usuário");
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [cupons, setCupons] = useState<any[]>([]);
  const [loadingCupons, setLoadingCupons] = useState(false);
  const [produtoImagem, setProdutoImagem] = useState<string | null>(null);

  const [eventosPendentes, setEventosPendentes] = useState<EventoPendente[]>(
    []
  );
  const [eventoModalId, setEventoModalId] = useState<string | null>(null);
  const [modalAbertoAutomatico, setModalAbertoAutomatico] = useState(false);

  const [recompensasQtd, setRecompensasQtd] = useState(0);

  const [levelBonus, setLevelBonus] = useState<LevelBonusData>({
    level_bonus_percent: 0,
    level_bonus_started_at: null,
    level_bonus_expires_at: null,
    level_bonus_active: false,
  });

  // NOVO: controle de visitante/logado
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // usados no modal de envio de prova
  const [relato, setRelato] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  /* -----------------------------------------------------
     cálculo de pontos estimado
  ----------------------------------------------------- */
  const pointsMin = gain10 !== null ? Math.round(gain10 * 100) : null;
  const pointsMax = gain30 !== null ? Math.round(gain30 * 100) : null;

  /* -----------------------------------------------------
     1) Descobrir se está logado
     Se não estiver, entra em modo visitante sem quebrar
  ----------------------------------------------------- */
useEffect(() => {
  async function verificarSessaoECarregarResumo() {
    try {
      const [resSummary, resSaldo] = await Promise.all([
        fetch("/api/dashboard/summary", {
          method: "POST",
          credentials: "include",
        }),
        fetch("/api/saldo", {
          credentials: "include",
        }),
      ]);

      const summary = resSummary.ok ? await resSummary.json() : null;
      const saldo = resSaldo.ok ? await resSaldo.json() : null;

      const visitante = !!summary?.is_guest || !resSaldo.ok;

      if (visitante) {
        setIsGuest(true);
        setUserName("Visitante");
        setTotalPoints(0);

        const bonusData: LevelBonusData = {
          level_bonus_percent: 0,
          level_bonus_started_at: null,
          level_bonus_expires_at: null,
          level_bonus_active: false,
        };

        setLevelBonus(bonusData);
        localStorage.removeItem("dashboard_level_bonus");

        window.dispatchEvent(
          new CustomEvent("dashboard:level-bonus-updated", {
            detail: bonusData,
          })
        );

        return;
      }

      setIsGuest(false);

      if (summary?.user_name) {
        setUserName(summary.user_name);
      }

      setTotalPoints(saldo?.saldo ?? 0);

      const bonusData: LevelBonusData = {
        level_bonus_percent: summary?.level_bonus_percent ?? 0,
        level_bonus_started_at: summary?.level_bonus_started_at ?? null,
        level_bonus_expires_at: summary?.level_bonus_expires_at ?? null,
        level_bonus_active: summary?.level_bonus_active ?? false,
      };

      setLevelBonus(bonusData);

      localStorage.setItem(
        "dashboard_level_bonus",
        JSON.stringify(bonusData)
      );

      window.dispatchEvent(
        new CustomEvent("dashboard:level-bonus-updated", {
          detail: bonusData,
        })
      );
    } catch (err) {
      console.error("Erro ao verificar sessão do dashboard:", err);

      setIsGuest(true);
      setUserName("Visitante");
      setTotalPoints(0);

      const bonusData: LevelBonusData = {
        level_bonus_percent: 0,
        level_bonus_started_at: null,
        level_bonus_expires_at: null,
        level_bonus_active: false,
      };

      setLevelBonus(bonusData);
      localStorage.removeItem("dashboard_level_bonus");

      window.dispatchEvent(
        new CustomEvent("dashboard:level-bonus-updated", {
          detail: bonusData,
        })
      );
    } finally {
      setAuthChecked(true);
    }
  }

  verificarSessaoECarregarResumo();
}, []);

  /* -----------------------------------------------------
    2) Buscar eventos pendentes
    Só deve acontecer para usuário logado
  ----------------------------------------------------- */
  useEffect(() => {
    if (!authChecked || isGuest) return;

    async function carregarEventosPendentes() {
      try {
        const res = await fetch("/api/compras", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();
        emitirXpUpdate(json);

        const eventos = json.data || [];
        setEventosPendentes(eventos);

        const pendente = eventos.find((e: EventoPendente) =>
          statusExigeResposta(e.status)
        );

        if (pendente && !modalAbertoAutomatico) {
          setEventoModalId(pendente.id);
          setModalAbertoAutomatico(true);
        }
      } catch (err) {
        console.error("Erro ao carregar eventos pendentes:", err);
      }
    }

    carregarEventosPendentes();
  }, [authChecked, isGuest, modalAbertoAutomatico]);

  /* -----------------------------------------------------
    3) Buscar recompensas disponíveis
    Só para usuário logado
  ----------------------------------------------------- */
  useEffect(() => {
    if (!authChecked || isGuest) return;

    fetch("/api/recdisponivel", {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        setRecompensasQtd(data?.total_disponiveis || 0);
      })
      .catch((err) => {
        console.error("Erro ao buscar recompensas disponíveis:", err);
        setRecompensasQtd(0);
      });
  }, [authChecked, isGuest]);

  /* -----------------------------------------------------
    Ações privadas do modal
  ----------------------------------------------------- */
  async function acaoConfirmar(eventoId: string) {
    const res = await fetch("/api/compras/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId }),
    });

    if (!res.ok) return;

    const json = await res.json();
    emitirXpUpdate(json);
    window.location.reload();
  }

  async function acaoDescartar(eventoId: string) {
    await fetch("/api/compras/descartar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId }),
    });

    window.location.reload();
  }

  async function acaoConfirmarCancelamento(eventoId: string) {
    await fetch("/api/compras/confirmar-cancelamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId }),
    });

    window.location.reload();
  }

  async function acaoNegarCancelamento(eventoId: string) {
    await fetch("/api/compras/negar-cancelamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId }),
    });

    window.location.reload();
  }

  async function uploadComprovante() {
    if (!eventoModalId) return;
    if (!arquivo) {
      alert("Selecione um arquivo");
      return;
    }

    const formData = new FormData();
    formData.append("evento_id", eventoModalId);
    formData.append("file", arquivo);
    formData.append("resposta", relato);

    const res = await fetch("/api/compras/upload-prova", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Erro ao enviar documentos");
      return;
    }

    setEventoModalId(null);
    window.location.reload();
  }

  function identificarLojaNaoSuportada(hostname: string): string | null {
    if (hostname.includes("amazon.")) return "Amazon";
    if (hostname.includes("aliexpress.")) return "AliExpress";
    if (hostname.includes("kabum.")) return "KaBuM!";
    if (hostname.includes("shein.")) return "Shein";
    if (
      hostname.includes("magazineluiza.") ||
      hostname.includes("magalu.")
    )
      return "Magazine Luiza";
    if (hostname.includes("americanas.")) return "Americanas";
    if (hostname.includes("casasbahia.")) return "Casas Bahia";
    if (hostname.includes("carrefour.")) return "Carrefour";
    if (hostname.includes("extra.")) return "Extra";
    if (
      hostname.includes("pontofrio.") ||
      hostname.includes("ponto.")
    )
      return "Ponto";

    return null;
  }

  /* -----------------------------------------------------
   handleGenerate
   Nesta etapa ainda mantém as mesmas APIs
   Depois vamos adaptar backend para visitante
  ----------------------------------------------------- */
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTrackedLink(null);

    setProdutoNome(null);
    setProdutoImagem(null);
    setValor(null);
    setPontos(null);
    setGain10(null);
    setGain30(null);
    setCupons([]);

    if (!url || !/^https?:\/\//i.test(url)) {
      setError("Cole um link válido que comece com http:// ou https://");
      return;
    }

    try {
      setLoading(true);

      const originalUrl = url.trim();
      setUrl("");

      let hostname = "";

      try {
        hostname = new URL(originalUrl).hostname.toLowerCase();
      } catch {
        hostname = originalUrl.toLowerCase();
      }

      const isShopee =
        hostname.includes("shopee.com") ||
        hostname.includes("shopee.com.br") ||
        hostname.includes("s.shopee") ||
        hostname.includes("br.shopee") ||
        hostname.includes("shp.ee") ||
        hostname.includes("br.shp.ee") ||
        hostname.includes("shope.ee");

      const isML =
        hostname.includes("mercadolivre") ||
        hostname.includes("meli.la") ||
        hostname.includes("mercadolibre");

      const lojaNaoSuportada = identificarLojaNaoSuportada(hostname);

      if (!isShopee && !isML && lojaNaoSuportada) {
        setError(
          `🚧 Ainda não funciona para links da ${lojaNaoSuportada}. Estamos trabalhando para liberar essa loja em breve.`
        );
        setLoading(false);
        return;
      }

      if (!isShopee && !isML) {
        setError(
          "Esse link ainda não é compatível. No momento, use links da Shopee ou do Mercado Livre."
        );
        setLoading(false);
        return;
      }

      let data;

      console.log("URL:", originalUrl);
      console.log("Shopee detectado:", isShopee);

      if (isShopee) {
        console.log("Chamando API Shopee");
        const res = await fetch("/api/shopee/short-link", {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originalUrl }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err?.error ||
              "Erro ao gerar link Shopee. Nas próximas etapas vamos liberar totalmente o modo visitante."
          );
        }

        data = await res.json();

        if (!isGuest) {
          window.dispatchEvent(
            new CustomEvent("xp:updated", {
              detail: data,
            })
          );
        }
      } else {
        console.log("Chamando API Mercado Livre");
        const res = await fetch("/api/gerar-link", {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productUrl: originalUrl,
            platform: "mercadolivre",
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err?.error ||
              "Erro ao gerar link. Nas próximas etapas vamos liberar totalmente o modo visitante."
          );
        }

        data = await res.json();

        if (!isGuest) {
          window.dispatchEvent(
            new CustomEvent("xp:updated", {
              detail: data,
            })
          );
        }

        await fetch("/api/cliques", {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produto_nome: data.produto_nome,
            produto_url: data.produto_url,
            link_rastreado: data.link_rastreado,
            valor: data.valor,
            ganhos: data.ganhos,
            perfil_aut: data.perfil_aut,
            categoria_niveis: data.categoria_niveis,
            marca: data.marca,
            produto_imagem: data.produto_imagem,
          }),
        }).catch(() => {
          // não quebra a experiência se esse registro falhar
        });
      }

      setTrackedLink(data.link_rastreado);
      setGain10(data.ganho_min ?? null);
      setGain30(data.ganho_max ?? null);
      setProdutoNome(data.produto_nome ?? null);
      setProdutoImagem(data.produto_imagem ?? null);
      setValor(data.valor ?? null);
      setPontos(data.pontos ?? null);

      setLoadingCupons(true);

      const cupomEndpoint = isShopee
        ? "/api/cupom/shopee"
        : "/api/cupom/ML";

      fetch(cupomEndpoint, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link_rastreado: data.link_rastreado,
        }),
      })
        .then((res) => res.json())
        .then((cuponsData) => {
          setCupons(cuponsData || []);
        })
        .catch((err) => {
          console.error("Erro ao buscar cupons:", err);
          setCupons([]);
        })
        .finally(() => {
          setLoadingCupons(false);
        });
    } catch (err: any) {
      setError(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copyTrackedLink() {
    if (!trackedLink) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(trackedLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = trackedLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyMessage(
        isGuest
          ? "✅ Link copiado! Faça login para ganhar pontos nas compras."
          : "🎮 Link copiado! Complete a missão: Compre pelo link e ganhe pontos."
      );

      const el = document.querySelector(".btn-copy");
      if (el) {
        el.classList.add("copied");
        setTimeout(() => el.classList.remove("copied"), 1600);
      }

      setTimeout(() => setCopyMessage(null), 16000);
    } catch (err) {
      setCopyMessage("❌ Erro ao copiar");
      setTimeout(() => setCopyMessage(null), 2000);
    }
  }

  async function handleOpenTrackedLink() {
    if (!trackedLink) {
      alert("Link rastreado indisponível.");
      return;
    }

    window.open(trackedLink, "_blank");
  }

  function submitFromButton() {
    handleGenerate({ preventDefault() {} } as unknown as React.FormEvent);
  }

  /* -----------------------------------------------------
   Métricas privadas
  ----------------------------------------------------- */
  const pontosEmAnalise = eventosPendentes
    .filter(
      (e) =>
        e.status !== "DESCARTADO" &&
        e.status !== "CANCELADO_DEFINITIVO" &&
        e.status !== "CONFIRMADO_FINAL"
    )
    .reduce((total, e) => total + Math.round((e.ganho_pontos ?? 0) * 100), 0);

  const pontosEmAnaliseTexto = pontosEmAnalise.toString();

  const comprasEmAnalise = eventosPendentes.filter(
    (e) =>
      e.status !== "DESCARTADO" &&
      e.status !== "CANCELADO_DEFINITIVO" &&
      e.status !== "CONFIRMADO_FINAL"
  ).length;

  return (
    <>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-glow" />

          <div className="dashboard-content">
            {copyMessage && <div className="toast-popup">{copyMessage}</div>}

            <HeroLinkForm
              url={url}
              setUrl={setUrl}
              loading={loading}
              loadingCupons={loadingCupons}
              cuponsCount={cupons.length}
              error={error}
              setError={setError}
              onSubmit={submitFromButton}
              isGuest={isGuest}
            />

            <ResultCard
              trackedLink={trackedLink}
              produtoNome={produtoNome}
              produtoImagem={produtoImagem}
              valor={valor}
              pontos={pontos}
              pointsMin={pointsMin}
              pointsMax={pointsMax}
              copyMessage={copyMessage}
              isGuest={isGuest}
              onCopy={copyTrackedLink}
              onOpen={handleOpenTrackedLink}
            />

            {trackedLink && (
              <div className="dashboard-coupons">
                <div className="card-title">
                  {!loadingCupons && cupons.length === 0 ? (
                    <h3 className="dashboard-coupons-title coupon-empty-title">
                      Infelizmente nenhum cupom disponível para este produto :(
                    </h3>
                  ) : (
                    <h3 className="dashboard-coupons-title">
                      🎟️ Cupons disponíveis para este produto:
                    </h3>
                  )}
                </div>

                {loadingCupons && <p>Buscando cupons...</p>}

                {!loadingCupons && cupons.length > 0 && (
                  <div className="coupon-list">
                    {cupons.map((c) => (
                      <div key={c.id_cupom} className="coupon-card premium">
                        <div className="coupon-top">
                          <div className="coupon-top-left">
                            <span className="coupon-badge">{c.descricao}</span>

                            {c.categoria_match && (
                              <span className="coupon-category-text">
                                Categoria: {c.categoria_match}
                              </span>
                            )}
                          </div>

                          <span className="coupon-discount">{c.valor} OFF</span>
                        </div>

                        <div className="coupon-code-box">
                          <span className="coupon-code-label">Código</span>
                          <div className="coupon-code-value">{c.cupom}</div>

                          <button
                            className="coupon-copy-btn"
                            onClick={async () => {
                              navigator.clipboard.writeText(c.cupom);

                              const el = document.getElementById(
                                `copy-${c.id_cupom}`
                              );
                              if (el) {
                                el.innerText = "código copiado!";
                                setTimeout(() => {
                                  el.innerText = "Copiar";
                                }, 1500);
                              }

                              fetch("/api/cupom/click", {
                                credentials: "include",
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ cupom_id: c.id_cupom }),
                              }).catch(() => {});
                            }}
                            id={`copy-${c.id_cupom}`}
                          >
                            Copiar
                          </button>
                        </div>

                        {c.regras && (
                          <details className="coupon-rules">
                            <summary>Ver regras do cupom</summary>
                            <p>{c.regras}</p>
                          </details>
                        )}

                        <div className="coupon-footer">
                          <span className="footer-conf">
                            Confiabilidade: {c.score_confiabilidade}
                          </span>

                          <span className="footer-click">
                            Cliques: {c.vezes_click}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CARDS PRIVADOS: só logado */}
            {authChecked && !isGuest && (
            <div className="status-cards">
              <Link href="/dashboard/compras" className="status-card-link">
                <div className="status-card">
                  <div className="status-title">Pontos em Análise</div>
                  <div className="status-value">{pontosEmAnaliseTexto}</div>
                  <div className="status-asset" aria-hidden />
                  <img
                    src="/cards/coins.png"
                    alt=""
                    className="status-image-analysis"
                    aria-hidden
                  />
                </div>
              </Link>

              <Link href="/dashboard/recompensas" className="status-card-link">
                <div className="status-card recompensa">
                  <div className="status-title">Recompensas Disponíveis</div>
                  <div className="status-overlay">
                    <div className="status-value-rec">
                      {recompensasQtd > 0 ? (
                        <>
                          <span className="plus">+</span>
                          {recompensasQtd}
                        </>
                      ) : (
                        0
                      )}
                    </div>
                  </div>

                  <img
                    src="/cards/recompensa.png"
                    alt=""
                    className="status-image-recompensa"
                    aria-hidden
                  />
                </div>
              </Link>

              <Link href="/dashboard/compras" className="status-card-link">
                <div className="status-card">
                  <div className="status-title">Compras em Análise</div>
                  <div className="status-value-lupa">{comprasEmAnalise}</div>
                  <div className="status-asset" aria-hidden />
                  <img
                    src="/cards/lupa.png"
                    alt=""
                    className="status-image-lupa"
                    aria-hidden
                  />
                </div>
              </Link>
            </div>
          )}

          {authChecked && isGuest && (
            <div className="guest-about-section">
              <div className="guest-about-header">
                <h3>Como funciona a BuyGain</h3>
                <p>
                  Encontre o cupom certo para a sua compra de forma otimizada e acertiva, finalize a compra com o link rastreado e receba pontos para trocar por beneficios. — <b>100% GRATIS</b>.
                </p>
              </div>

              <Link href="/public"className="guest-about-grid">
                <div className="guest-about-card">
                  <div className="guest-about-icon">🎟️</div>
                  <div className="guest-about-title">Busca ótimizada de cupons</div>
                  <div className="guest-about-text">
                    Buscamos cupons compatíveis com o produto, valor e categoria da sua compra — evitando erros e aumentando suas chances de desconto real.
                  </div>
                </div>

                <div className="guest-about-card">
                  <div className="guest-about-icon">🔗</div>
                  <div className="guest-about-title">Suas compras valem pontos</div>
                  <div className="guest-about-text">
                    Compre usando nosso link rastreado e receba pontos para trocar por recompensas que valem dinheiro — Cada 100 pontos é R$1,00.
                  </div>
                </div>

                <div className="guest-about-card highlight">
                  <div className="guest-about-icon">💎</div>
                  <div className="guest-about-title">Pontos é benefícios reais</div>
                  <div className="guest-about-text">
                    Troque seus pontos por GIFT CARDS dos maiores jogos (Roblox, Free fire, Mobile legends, LOL, Valorant...), streaming (Netflix, spotify), restaurantes e serviços. Recompensas com valor real — sem complicação.
                  </div>
                </div>
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* MODAL PRIVADO: só logado */}
      {authChecked && !isGuest && (
        <EventsModal
          eventoModalId={eventoModalId}
          eventosPendentes={eventosPendentes}
          onClose={() => setEventoModalId(null)}
          onConfirmar={acaoConfirmar}
          onDescartar={acaoDescartar}
          onConfirmarCancelamento={acaoConfirmarCancelamento}
          onNegarCancelamento={acaoNegarCancelamento}
          relato={relato}
          setRelato={setRelato}
          arquivo={arquivo}
          setArquivo={setArquivo}
          onUploadProva={uploadComprovante}
        />
      )}
    </>
  );
}