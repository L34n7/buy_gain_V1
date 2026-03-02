
"use client";

import React, { useState, useEffect } from "react";
import "./dashboard.css";

import {
  statusExigeResposta,
} from "./utils/prazo";

import EventsModal from "../components/EventsModal";
import HeroLinkForm from "./components/HeroLinkForm";
import ResultCard from "./components/ResultCard";
import Link from "next/link";
import { emitirXpUpdate } from "@/lib/xpEmitter";

/* =====================================================
   page.tsx - Conteúdo da página Início (limpo)
   - Sidebar / Header foram movidos para components/
   - Mantive toda a lógica de geração de links e estados
   - Removi logoFaded / Header / Sidebar do arquivo
===================================================== */

/* ======================================================
   TIPAGEM DOS DADOS QUE VÊM DA API COMPRAS
====================================================== */
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

export default function Home() {
  /* --------------------------
     STATES (mantidos)
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
  const [modalAbertoAutomatico, setModalAbertoAutomatico] =
    useState(false);

  // usados no modal de envio de prova
  const [relato, setRelato] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  /* -----------------------------------------------------
     cálculo de pontos estimado (mantido)
  ----------------------------------------------------- */
  const pointsMin = gain10 !== null ? Math.round(gain10 * 100) : null;
  const pointsMax = gain30 !== null ? Math.round(gain30 * 100) : null;

  /* -----------------------------------------------------
    Buscar eventos assim que o Dashboard abrir
  ----------------------------------------------------- */
  useEffect(() => {
    async function carregarEventosPendentes() {
      const res = await fetch("/api/compras", {
        method: "POST",
        credentials: "include", // 🔑 ESSENCIAL
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
    }

    carregarEventosPendentes();
  }, []);



  /* -----------------------------------------------------------------
   CARD Recompensas Disponíveis - Buscar giftcads de acordo com saldo
  ------------------------------------------------------------------- */
  const [recompensasQtd, setRecompensasQtd] = useState(0);

  useEffect(() => {
    fetch("/api/recdisponivel", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        setRecompensasQtd(data.total_disponiveis || 0);
      });
  }, []);


  /* -----------------------------------------------------
    Criar as funções de ação
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

  /* -----------------------------------------------------
    Upload do comprovante (método adicionado ao Dashboard)
  ----------------------------------------------------- */
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

    // fecha modal e atualiza lista
    setEventoModalId(null);
    window.location.reload();
  }

  

  /* -----------------------------------------------------
     carregar resumo do usuário (mantido aqui, para os cards)
     -> note: é OK ter isso aqui mesmo que o Header também busque.
  ----------------------------------------------------- */
useEffect(() => {
  async function carregarResumo() {
    try {
      const [resSummary, resSaldo] = await Promise.all([
        fetch("/api/dashboard/summary", {
      method: "POST",
      credentials: "include",
    }),
        fetch("/api/saldo", { credentials: "include" }),
      ]);

      const summary = await resSummary.json();
      const saldo = await resSaldo.json();

      if (summary?.user_name) setUserName(summary.user_name);

      setTotalPoints(saldo?.saldo ?? 0);

    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    }
  }

  carregarResumo();
}, []);



/* -----------------------------------------------------
   handleGenerate
----------------------------------------------------- */
async function handleGenerate(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  setTrackedLink(null);

  if (!url || !/^https?:\/\//i.test(url)) {
    setError("Cole um link válido que comece com http:// ou https://");
    return;
  }

  try {
    setLoading(true);

    const originalUrl = url;
    setUrl("");

    const isShopee = /shopee\.com\.br|shopee\.com/i.test(originalUrl);

    let data;

    /* ==============================
      🔥 SHOPEE
    ============================== */
    if (isShopee) {
      const res = await fetch("/api/shopee/short-link", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originUrl: originalUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erro ao gerar link Shopee");
      }

      data = await res.json();

      // 🔥 DISPARA EVENTO GLOBAL (XP + CONQUISTAS)
      window.dispatchEvent(
        new CustomEvent("xp:updated", {
          detail: data,
        })
      );
    }

    /* ==============================
      🔥 MERCADO LIVRE
    ============================== */
    else {
      const res = await fetch("/api/gerar-link", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: originalUrl,
          platform: "mercadolivre",
        }),
      });

      if (!res.ok) throw new Error("Erro ao gerar link ML");

      data = await res.json(); 

      console.log("Imagem recebida do gerar-link:", data.produto_imagem);

      // 🔥 DISPARA EVENTO GLOBAL (XP + CONQUISTAS)
      window.dispatchEvent(
        new CustomEvent("xp:updated", {
          detail: data,
        })
      );

      // mantém sua estrutura atual do ML
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
      });
    }

    /* ==============================
       🔥 ATUALIZA ESTADOS
    ============================== */

    setTrackedLink(data.link_rastreado);
    setGain10(data.ganho_min ?? null);
    setGain30(data.ganho_max ?? null);
    setProdutoNome(data.produto_nome ?? null);
    setProdutoImagem(data.produto_imagem ?? null);
    setValor(data.valor ?? null);
    setPontos(data.pontos ?? null);

    /* ==============================
       🔥 BUSCAR CUPONS (DINÂMICO)
    ============================== */

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


 

  // função de copiar (usa setCopyMessage para feedback)
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
        "🎮 Link copiado! Complete a missão: compre pelo link e ganhe pontos."
      ); // animação visual curta
      const el = document.querySelector(".btn-copy");
      if (el) {
        el.classList.add("copied");
        setTimeout(() => el.classList.remove("copied"), 1600);
      }
      setTimeout(() => setCopyMessage(null), 6000);
    } catch (err) {
      setCopyMessage("❌ Erro ao copiar");
      setTimeout(() => setCopyMessage(null), 2000);
    }
  }

  /* -----------------------------------------------------
     abrir link rastreado (mantido)
  ----------------------------------------------------- */
  async function handleOpenTrackedLink() {
    if (!trackedLink) {
      alert("Link rastreado indisponível.");
      return;
    }

    window.open(trackedLink, "_blank");
  }


  /* -----------------------------------------------------
     wrapper simples para chamar handleGenerate a partir do botão
  ----------------------------------------------------- */
  function submitFromButton() {
    handleGenerate({ preventDefault() {} } as unknown as React.FormEvent);
  }

  /* -----------------------------------------------------
   Pontos em análise (ml_eventos)
   Exclui status finais e descartados
----------------------------------------------------- */
  const pontosEmAnalise = eventosPendentes
    .filter((e) =>
      e.status !== "DESCARTADO" &&
      e.status !== "CANCELADO_DEFINITIVO" &&
      e.status !== "CONFIRMADO_FINAL"
    )
    .reduce((total, e) => total + (e.ganho_pontos ?? 0), 0);

  const pontosEmAnaliseFormatado =
    Math.floor(pontosEmAnalise * 100) / 100;

  const pontosEmAnaliseTexto =
    pontosEmAnaliseFormatado.toFixed(2);

/* -----------------------------------------------------
   Compras em análise (quantidade de eventos válidos)
----------------------------------------------------- */
  const comprasEmAnalise = eventosPendentes.filter(
    (e) =>
      e.status !== "DESCARTADO" &&
      e.status !== "CANCELADO_DEFINITIVO" &&
      e.status !== "CONFIRMADO_FINAL"
  ).length;


  /* =====================================================
     RENDER: conteúdo da página (agora só o corpo)
     Layout, Header e Sidebar são providos pelo layout.tsx
  ===================================================== */
  return (
    <>
      {/* container central */}
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-glow" />

          <div className="dashboard-content">
            {/* 🔔 POPUP / TOAST */}
            {copyMessage && <div className="toast-popup">{copyMessage}</div>}

          <HeroLinkForm
            url={url}
            setUrl={setUrl}
            loading={loading}
            error={error}
            onSubmit={submitFromButton}
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
            onCopy={copyTrackedLink}
            onOpen={handleOpenTrackedLink}
          />


            {/* CUPONS COMPATÍVEIS */}
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
                        {/* TOPO */}
                        <div className="coupon-top">
                          <div className="coupon-top-left">
                            <span className="coupon-badge">{c.descricao}</span>

                            {c.categoria_match && <span className="coupon-category-text">Categoria: {c.categoria_match}</span>}
                          </div>

                          <span className="coupon-discount">{c.valor} OFF</span>
                        </div>

                        {/* CÓDIGO */}
                        <div className="coupon-code-box">
                          <span className="coupon-code-label">Código</span>
                          <div className="coupon-code-value">{c.cupom}</div>

                          <button
                            className="coupon-copy-btn"
                            onClick={async () => {
                              // copia
                              navigator.clipboard.writeText(c.cupom);

                              // feedback visual
                              const el = document.getElementById(`copy-${c.id_cupom}`);
                              if (el) {
                                el.innerText = "código copiado!";
                                setTimeout(() => {
                                  el.innerText = "Copiar";
                                }, 1500);
                              }

                              // 🔥 incrementa clique (fire and forget)
                              fetch("/api/cupom/click", {
                                credentials: "include",
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ cupom_id: c.id_cupom }),
                              });
                            }}
                            id={`copy-${c.id_cupom}`}
                          >
                            Copiar
                          </button>

                        </div>

                        {/* REGRAS */}
                        {c.regras && (
                          <details className="coupon-rules">
                            <summary>Ver regras do cupom</summary>
                            <p>{c.regras}</p>
                          </details>
                        )}

                        {/* RODAPÉ */}
                        <div className="coupon-footer">
                          <span className="footer-conf">Confiabilidade: {c.score_confiabilidade}</span>

                          <span className="footer-click">Cliques: {c.vezes_click}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* status cards */}
            <div className="status-cards">

            <Link href="/dashboard/compras" className="status-card-link">
              <div className="status-card">
                <div className="status-title">Pontos em Análise</div>
                <div className="status-value">  {pontosEmAnaliseTexto}</div>
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
          </div>
        </div>
      </div>

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
    </>
  );
}
