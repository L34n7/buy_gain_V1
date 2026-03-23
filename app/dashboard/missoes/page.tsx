"use client";

import React, { useEffect, useState } from "react";
import "../dashboard.css";
import "./missoes.css";
import { emitirXpUpdate } from "@/lib/xpEmitter";

type Missao = {
  id: string;
  titulo: string;
  descricao: string;
  xp: number;
  pontos: number;
  status: "DISPONIVEL" | "CONCLUIDA" | "EM_BREVE";
  dataConclusao?: string | null;
};

export default function Missoes() {
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const [codigoInstagram, setCodigoInstagram] = useState("");
  const [validandoInstagram, setValidandoInstagram] = useState(false);
  const [erroInstagram, setErroInstagram] = useState<string | null>(null);

  useEffect(() => {
    async function carregarMissoes() {
      try {
        const res = await fetch("/api/missoes", {
          credentials: "include",
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Erro API:", errText);
          return;
        }

        const json = await res.json();

        const perfilMissao: Missao = {
          id: "perfil_completo",
          titulo: "Complete seu Perfil",
          descricao: "Preencha todos os dados do seu perfil.",
          xp: 200,
          pontos: 260,
          status:
            json?.perfil_completo?.concluida || json?.concluida
              ? "CONCLUIDA"
              : "DISPONIVEL",
          dataConclusao:
            json?.perfil_completo?.data_conclusao ??
            json?.data_conclusao ??
            null,
        };

      const outrasMissoes: Missao[] = [
        {
          id: "seguir_instagram",
          titulo: "Siga nosso Instagram",
          descricao:
            "Siga o Instagram da Buygain, peça o código no direct, cole na caixa de texto e clique em Concluir missão..",
          xp: 150,
          pontos: 150,
          status: json?.seguir_instagram?.concluida
            ? "CONCLUIDA"
            : "DISPONIVEL",
          dataConclusao: json?.seguir_instagram?.data_conclusao ?? null,
        },
        {
          id: "grupo_whatsapp",
          titulo: "Entre no Grupo do WhatsApp",
          descricao: "Receba ofertas e novidades exclusivas.",
          xp: 150,
          pontos: 200,
          status: "EM_BREVE",
        },
        {
          id: "grupo_discord",
          titulo: "Participe do Discord",
          descricao: "Conecte-se com a comunidade.",
          xp: 150,
          pontos: 200,
          status: "EM_BREVE",
        },
      ];

        setMissoes([perfilMissao, ...outrasMissoes]);
      } catch (err) {
        console.error("Erro REAL:", err);
      } finally {
        setLoading(false);
      }
    }

    carregarMissoes();
  }, []);

  async function concluirMissaoInstagram() {
    setErroInstagram(null);

    const codigoLimpo = codigoInstagram.trim().toUpperCase();

    if (!codigoLimpo) {
      setErroInstagram("Digite o código recebido no Instagram.");
      return;
    }

    setValidandoInstagram(true);

    try {
      const res = await fetch("/api/missoes/instagram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          codigo: codigoLimpo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroInstagram(data?.error || "Erro ao validar código.");
        return;
      }

      setMissoes((prev) =>
        prev.map((m) =>
          m.id === "seguir_instagram"
            ? {
                ...m,
                status: "CONCLUIDA",
                dataConclusao: data?.data_conclusao ?? new Date().toISOString(),
              }
            : m
        )
      );

      emitirXpUpdate({
        xp_ganho: data?.xp_ganho ?? 150,
        pontos_ganhos: data?.pontos_ganhos ?? 150,
      });

      setCodigoInstagram("");
    } catch (err) {
      console.error("Erro ao concluir missão Instagram:", err);
      setErroInstagram("Erro inesperado ao validar o código.");
    } finally {
      setValidandoInstagram(false);
    }
  }

  return (
    <div className="dashboard-container missoes-root">
      <div className="dashboard-card missoes-card">
        <div className="dashboard-glow" />

        <div className="missoes-content">
          <div className="missoes-header">
            <div>
              <h2 className="missoes-title">Missões</h2>
              <p className="missoes-subtitle">
                Complete missões e ganhe XP e Pontos.
              </p>
            </div>
          </div>

          {loading && <p className="loading-text">Carregando missões...</p>}

          <div className="missoes-grid">
            {missoes.map((missao) => (
              <div
                key={missao.id}
                className={`missao-card ${
                  missao.status === "EM_BREVE" ? "missao-bloqueada" : ""
                }`}
              >
                {missao.status === "EM_BREVE" && (
                  <div className="missao-overlay">🚧 EM BREVE</div>
                )}

                <div className="missao-info">
                  <h3>{missao.titulo}</h3>
                  <p>{missao.descricao}</p>
                </div>

                <div className="missao-recompensa">
                  <span className="xp-m">+{missao.xp} XP</span>
                  <span className="pontos-m">+{missao.pontos} Pontos</span>
                </div>

                <div className="missao-acoes">
                  {missao.status === "CONCLUIDA" ? (
                  <div className="missao-status-box">
                    <span className="missao-concluida">✓ Concluída</span>
                    {missao.dataConclusao && (
                      <div className="missao-data">
                        Concluída em{" "}
                        {new Date(missao.dataConclusao).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  ) : missao.id === "perfil_completo" ? (
                    <a
                      href="/dashboard/perfil-config"
                      className="btn btn-primary"
                    >
                      Completar Perfil
                    </a>
                  ) : missao.id === "seguir_instagram" ? (
                  <div className="instagram-missao-box">
                    <a
                      href="https://instagram.com/buy_gain"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                    >
                      Ir para Instagram
                    </a>

                    <div className="instagram-codigo-row">
                      <input
                        type="text"
                        value={codigoInstagram}
                        onChange={(e) => setCodigoInstagram(e.target.value)}
                        placeholder="Digite o código"
                        maxLength={20}
                        autoComplete="off"
                        className="instagram-codigo-input"
                      />

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={concluirMissaoInstagram}
                        disabled={validandoInstagram}
                      >
                        {validandoInstagram ? "Validando..." : "Concluir missão"}
                      </button>
                    </div>

                    {erroInstagram && (
                      <div className="instagram-codigo-erro">
                        {erroInstagram}
                      </div>
                    )}
                  </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="novidades-card">
            <h3>🚀 Novidades em breve</h3>
            <p>Em breve novas formas de ganhar pontos!</p>
          </div>
        </div>
      </div>
    </div>
  );
}