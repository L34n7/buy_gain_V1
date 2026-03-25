"use client";

import React, { useEffect, useState } from "react";
import "../dashboard.css";
import "./missoes.css";

type Missao = {
  id: string;
  titulo: string;
  descricao: string;
  xp: number;
  pontos: number;
  status: "DISPONIVEL" | "CONCLUIDA" | "EM_BREVE";
  dataConclusao?: string | null;
};

type MissoesResponse = {
  perfil_completo?: {
    concluida: boolean;
    data_conclusao: string | null;
  };
  seguir_instagram?: {
    concluida: boolean;
    data_conclusao: string | null;
  };
  indicacao?: {
    codigo_indicacao: string | null;
    total_confirmadas: number;
    concluida: boolean;
    data_conclusao: string | null;
    pontos_por_indicacao: number;
    pontos_indicado: number;
  };
};

export default function MissoesPage() {
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);

  const [codigoInstagram, setCodigoInstagram] = useState("");
  const [validandoInstagram, setValidandoInstagram] = useState(false);
  const [erroInstagram, setErroInstagram] = useState<string | null>(null);

  const [codigoIndicacao, setCodigoIndicacao] = useState<string>("");
  const [copiandoCodigo, setCopiandoCodigo] = useState(false);
  const [codigoCopiado, setCodigoCopiado] = useState(false);
  const [totalIndicacoesConfirmadas, setTotalIndicacoesConfirmadas] = useState(0);
  const [pontosPorIndicacao, setPontosPorIndicacao] = useState(250);
  const [pontosIndicado, setPontosIndicado] = useState(250);

  useEffect(() => {
    async function carregarMissoes() {
      try {
        const res = await fetch("/api/missoes", {
          credentials: "include",
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Erro API missões:", errText);
          return;
        }

        const json: MissoesResponse = await res.json();

        const indicacaoMissao: Missao = {
          id: "indicacao",
          titulo: "Indique e ganhe",
          descricao:
            "Compartilhe seu código com amigos. Quando eles concluírem a primeira compra, vocês dois ganham pontos.",
          xp: 400,
          pontos: json?.indicacao?.pontos_por_indicacao ?? 250,
          status: json?.indicacao?.concluida ? "CONCLUIDA" : "DISPONIVEL",
          dataConclusao: json?.indicacao?.data_conclusao ?? null,
        };

        const perfilMissao: Missao = {
          id: "perfil_completo",
          titulo: "Complete seu Perfil",
          descricao:
            "Preencha todos os dados do seu perfil para desbloquear sua recompensa.",
          xp: 200,
          pontos: 260,
          status: json?.perfil_completo?.concluida ? "CONCLUIDA" : "DISPONIVEL",
          dataConclusao: json?.perfil_completo?.data_conclusao ?? null,
        };

        const instagramMissao: Missao = {
          id: "seguir_instagram",
          titulo: "Siga nosso Instagram",
          descricao:
            "Siga o Instagram da BuyGain, peça o código no direct, cole abaixo e conclua a missão.",
          xp: 150,
          pontos: 150,
          status: json?.seguir_instagram?.concluida ? "CONCLUIDA" : "DISPONIVEL",
          dataConclusao: json?.seguir_instagram?.data_conclusao ?? null,
        };

        const futurasMissoes: Missao[] = [
          {
            id: "grupo_whatsapp",
            titulo: "Entre no Grupo do WhatsApp",
            descricao: "Receba ofertas e novidades exclusivas em primeira mão.",
            xp: 150,
            pontos: 200,
            status: "EM_BREVE",
          },
          {
            id: "grupo_discord",
            titulo: "Participe do Discord",
            descricao: "Conecte-se com a comunidade e descubra novas oportunidades.",
            xp: 150,
            pontos: 200,
            status: "EM_BREVE",
          },
        ];

        setMissoes([
          indicacaoMissao,
          perfilMissao,
          instagramMissao,
          ...futurasMissoes,
        ]);

        setCodigoIndicacao(json?.indicacao?.codigo_indicacao ?? "");
        setTotalIndicacoesConfirmadas(json?.indicacao?.total_confirmadas ?? 0);
        setPontosPorIndicacao(json?.indicacao?.pontos_por_indicacao ?? 250);
        setPontosIndicado(json?.indicacao?.pontos_indicado ?? 250);
      } catch (err) {
        console.error("Erro ao carregar missões:", err);
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

      setCodigoInstagram("");
    } catch (err) {
      console.error("Erro ao concluir missão Instagram:", err);
      setErroInstagram("Erro inesperado ao validar o código.");
    } finally {
      setValidandoInstagram(false);
    }
  }

  async function copiarMeuCodigoIndicacao() {
    if (!codigoIndicacao || copiandoCodigo) return;

    try {
      setCopiandoCodigo(true);
      await navigator.clipboard.writeText(codigoIndicacao);
      setCodigoCopiado(true);

      setTimeout(() => {
        setCodigoCopiado(false);
      }, 2200);
    } catch (err) {
      console.error("Erro ao copiar código de indicação:", err);
    } finally {
      setCopiandoCodigo(false);
    }
  }

  function formatarData(data?: string | null) {
    if (!data) return null;

    try {
      return new Date(data).toLocaleDateString("pt-BR");
    } catch {
      return data;
    }
  }

  function compartilharWhatsApp() {
    if (!codigoIndicacao) return;

    const mensagem = `🔥 Olha isso!

    Tô usando o BuyGain pra ganhar pontos e recompensas 💰

    Use meu código: ${codigoIndicacao}

    👉 Cadastre-se aqui:
    https://buygain.com.br/auth/cadastro?ref=${codigoIndicacao}

    Bora ganhar juntos 🚀`;

      const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

      window.open(url, "_blank");
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
                Complete missões, ganhe XP e acumule pontos.
              </p>
            </div>
          </div>

          {loading && <p className="loading-text">Carregando missões...</p>}

          {!loading && (
            <div className="missoes-grid">
              {missoes.map((missao) => (
                <div
                  key={missao.id}
                  className={`missao-card ${
                    missao.status === "EM_BREVE" ? "missao-bloqueada" : ""
                  } ${missao.id === "indicacao" ? "missao-card-indicacao" : ""}`}
                >
                  {missao.status === "EM_BREVE" && (
                    <div className="missao-overlay">🚧 EM BREVE</div>
                  )}

                  {missao.id === "indicacao" ? (
                    <>
                      <div className="missao-info indicacao-info">
                        <div className="indicacao-topo">
                          <div className="indicacao-topo-texto">
                            <h3>{missao.titulo}</h3>
                            <p>{missao.descricao}</p>
                          </div>

                          <div className="missao-recompensa indicacao-recompensa">
                            <span className="xp-m">+{missao.xp} XP</span>
                            <span className="pontos-m">+{missao.pontos} Pontos</span>
                          </div>
                        </div>

                        <div className="indicacao-grid">
                          <div className="indicacao-painel indicacao-painel-codigo">
                            <div className="indicacao-codigo-label">
                              Seu código de indicação
                            </div>

                            <div className="indicacao-codigo">
                              {codigoIndicacao || "Carregando..."}
                            </div>

                            <div className="indicacao-codigo-row">
                              <button
                                type="button"
                                className="btn btn-whatsapp"
                                onClick={compartilharWhatsApp}
                              >
                                Compartilhar no WhatsApp
                              </button>

                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={copiarMeuCodigoIndicacao}
                                disabled={!codigoIndicacao || copiandoCodigo}
                              >
                                {codigoCopiado
                                  ? "Copiado!"
                                  : copiandoCodigo
                                  ? "Copiando..."
                                  : "Copiar código"}
                              </button>
                            </div>

                          </div>

                          <div className="indicacao-painel indicacao-painel-stats">
                            <div className="indicacao-stat-card">
                              <span className="indicacao-stat-label">Confirmações</span>
                              <strong className="indicacao-stat-valor">
                                {totalIndicacoesConfirmadas}
                              </strong>
                            </div>

                            <div className="indicacao-stat-card">
                              <span className="indicacao-stat-label">
                                Recompensa por indicação
                              </span>
                              <strong className="indicacao-stat-valor">
                                {pontosPorIndicacao} pts
                              </strong>
                            </div>

                            <div className="indicacao-stat-card">
                              <span className="indicacao-stat-label">
                                Recompensa do amigo
                              </span>
                              <strong className="indicacao-stat-valor">
                                {pontosIndicado} pts
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="indicacao-ajuda">
                          Você ganha <strong>{pontosPorIndicacao} pontos</strong>{" "}
                          quando seu amigo conclui a <strong>primeira compra</strong>. Seu amigo
                          também ganha <strong>{pontosIndicado} pontos</strong>.
                        </div>
                      </div>


                    </>
                  ) : (
                    <>
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
                                Concluída em {formatarData(missao.dataConclusao)}
                              </div>
                            )}
                          </div>
                        ) : missao.id === "perfil_completo" ? (
                          <a href="/dashboard/perfil-config" className="btn btn-primary">
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
                                {validandoInstagram
                                  ? "Validando..."
                                  : "Concluir missão"}
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
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="novidades-card">
            <h3>🚀 Novidades em breve</h3>
            <p>Em breve novas formas de ganhar pontos e XP na plataforma.</p>
          </div>
        </div>
      </div>
    </div>
  );
}