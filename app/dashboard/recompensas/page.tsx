"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import "./recompensas.css";
import { emitirXpUpdate } from "@/lib/xpEmitter";

type GiftcardOpcao = {
  id: string;
  descricao: string;
  pontos: number;
};

type GiftcardComOpcoes = {
  id: string;
  nome: string;
  imagem: string;
  imagem_modal?: string;
  descricao: string;
  giftcard_opcoes: GiftcardOpcao[];
};

export default function RecompensasPage() {
  const [giftcardsDB, setGiftcardsDB] = useState<GiftcardComOpcoes[]>([]);
  const [giftcardSelecionado, setGiftcardSelecionado] =
    useState<GiftcardComOpcoes | null>(null);
  const [opcaoSelecionadaId, setOpcaoSelecionadaId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [debouncedBusca, setDebouncedBusca] = useState("");

  /* =========================
     CARREGAR GIFTCARDS
  ========================== */
  useEffect(() => {
    async function carregarGiftcards() {
      try {
        const res = await fetch("/api/recompensas/giftcards", {
          method: "POST",
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok) {
          setGiftcardsDB(data.data || []);
        } else {
          console.error("Erro ao carregar giftcards:", data.error);
        }
      } catch (err) {
        console.error("Erro ao carregar giftcards:", err);
      }
    }

    carregarGiftcards();
  }, []);


  const giftcardsFiltrados = giftcardsDB.filter((giftcard) =>
  giftcard.nome.toLowerCase().includes(debouncedBusca.toLowerCase())
);


  // debounce simples: atualiza debouncedBusca 300ms após o usuário parar de digitar
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusca(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);


  /* =========================
     RESGATAR RECOMPENSA
  ========================== */
  async function trocarPontos() {
    if (!giftcardSelecionado || !opcaoSelecionadaId) {
      alert("Selecione uma opção");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch("/api/recompensas/resgatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔥 padrão do projeto
        body: JSON.stringify({
          giftcard_opcao_id: opcaoSelecionadaId,
        }),
      });

      const data = await res.json();
      emitirXpUpdate(data);
      if (!res.ok) {
        setErro(data.error || "Erro ao resgatar recompensa");
        setLoading(false);
        return;
      }

      alert("🎉 Recompensa solicitada com sucesso!");

      // fecha modal e limpa estado
      setGiftcardSelecionado(null);
      setOpcaoSelecionadaId(null);
    } catch (err) {
      console.error("Erro ao resgatar recompensa:", err);
      setErro("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recompensas-page">
      <h1 className="recompensas-title"></h1>

      {/* ===== BUSCA ANIMADA ===== */}
      <div className="busca-container">
        <div className="busca-inner">

          <input
            type="text"
            placeholder="Buscar giftcard..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="busca-input"
            aria-label="Buscar giftcard"
          />

          {busca && (
            <button
              className="busca-clear"
              onClick={() => { setBusca(""); setDebouncedBusca(""); }}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* GRID DE GIFTCARDS */}
      <div className="giftcard-grid">
        {giftcardsFiltrados.map((giftcard) => (
          <div
            key={giftcard.id}
            className="giftcard-card"
            onClick={() => {
              setGiftcardSelecionado(giftcard);
              setOpcaoSelecionadaId(null);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setGiftcardSelecionado(giftcard);
            }}
          >
            <div className="giftcard-img-wrap">
              <Image
                src={giftcard.imagem}
                alt={giftcard.nome}
                fill
                className="giftcard-img"
              />
            </div>

            <span className="giftcard-name">{giftcard.nome}</span>
          </div>
        ))}
      </div>
      
      {giftcardsFiltrados.length === 0 && (
        <div className="no-results">Nenhum giftcard encontrado.</div>
        )}  

      {/* MODAL */}
      {giftcardSelecionado && (
        <div
          className="modal-overlay"
          onClick={() => setGiftcardSelecionado(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setGiftcardSelecionado(null)}
            >
              ✕
            </button>

            <h2>{giftcardSelecionado.nome}</h2>

            <div className="label-content">
              {/* ESQUERDA */}
              
            <div
              className="label-text"
              style={{
                backgroundImage: `url(${giftcardSelecionado.imagem_modal || giftcardSelecionado.imagem})`,
                backgroundSize: "130%",
                backgroundPosition: "60% 0%"
              }}
            >    

            {/* ===== INFO BANNER PREMIUM (lado esquerdo, sobre a imagem) ===== */}
            <div className="label-info" role="group" aria-label="Informações do giftcard">
              <div className="info-pill" aria-hidden="false">
                <svg className="info-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 8v8a6 6 0 0012 0V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="info-text"><strong>Uso exclusivo no Brasil</strong></div>
              </div>

              <div className="info-pill" aria-hidden="false">
                <svg className="info-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2"/>
                </svg>
                <div className="info-text"><strong>Entrega em até 48h</strong></div>
              </div>

              <div className="info-pill" aria-hidden="false">
                <svg className="info-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="info-text"><strong>O código será enviado para o seu email.</strong></div>
              </div>
            </div>


              {(giftcardSelecionado.descricao ?? "")
                .split("\n")
                .filter((linha) => linha.trim() !== "")
                .map((linha, index) => (
                  <p key={index}>{linha}</p>
              ))}
            </div>


              {/* DIREITA */}
              <div className="label-opcoes">
                <h3>Escolha uma opção:</h3>

                <div className="opcoes">
                  {giftcardSelecionado.giftcard_opcoes.map((opcao) => (
                    <button
                      key={opcao.id}
                      className={`opcao ${
                        opcaoSelecionadaId === opcao.id ? "ativa" : ""
                      }`}
                      onClick={() => setOpcaoSelecionadaId(opcao.id)}
                    >
                      <strong>{opcao.descricao}</strong>
                      <br />
                      <span>{opcao.pontos.toLocaleString()} pontos </span> 
                    </button>
                  ))}
                </div>

                {erro && <div className="erro">{erro}</div>}

                <button
                  className="trocar-btn"
                  onClick={trocarPontos}
                  disabled={!opcaoSelecionadaId || loading}
                >
                  {loading
                    ? "Resgatando..."
                    : !opcaoSelecionadaId
                    ? "Escolha uma opção"
                    : "Resgatar recompensa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
