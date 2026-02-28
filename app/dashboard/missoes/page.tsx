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

  useEffect(() => {
    async function carregarMissaoPerfil() {
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
          status: json.concluida ? "CONCLUIDA" : "DISPONIVEL",
          dataConclusao: json.data_conclusao ?? null,
        };

        const outrasMissoes: Missao[] = [
          {
            id: "grupo_whatsapp",
            titulo: "Entre no Grupo do WhatsApp",
            descricao: "Receba ofertas e novidades exclusivas.",
            xp: 150,
            pontos: 200,
            status: "EM_BREVE",
          },
          {
            id: "seguir_instagram",
            titulo: "Siga nosso Instagram",
            descricao: "Fique por dentro das novidades.",
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

    carregarMissaoPerfil();
  }, []);

  function concluirMissao(id: string) {
    const atualizadas: Missao[] = missoes.map((m) =>
      m.id === id ? { ...m, status: "CONCLUIDA" } : m
    );

    setMissoes(atualizadas);

    emitirXpUpdate({
      xp_ganho: 100,
      pontos_ganhos: 100,
    });
  }

  return (
    <div className="dashboard-container missoes-root">
      <div className="dashboard-card missoes-card">
        <div className="dashboard-glow" />

        <div className=" missoes-content">
          <div className="missoes-header">
            <div>
              <h2 className=" missoes-title">Missões</h2>
              <p className=" missoes-subtitle">
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
                {/* OVERLAY EM BREVE */}
                {missao.status === "EM_BREVE" && (
                  <div className="missao-overlay">
                    🚧 EM BREVE
                  </div>
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
                    <div>
                      <span className="missao-concluida">
                        ✓ Concluída
                      </span>
                      {missao.dataConclusao && (
                        <div className="missao-data">
                          Concluída em{" "}
                          {new Date(
                            missao.dataConclusao
                          ).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                  ) : missao.status === "DISPONIVEL" ? (
                    <a
                      href="/dashboard/perfil-config"
                      className="btn btn-primary"
                    >
                      Completar Perfil
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* 🔮 Em Breve Geral */}
          <div className="novidades-card">
            <h3>🚀 Novidades em breve</h3>
            <p>
              Em breve novas formas de ganhar pontos!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}