"use client";

import React, { useEffect, useState } from "react";
import "../dashboard.css";
/* novo arquivo CSS local para a tela Compras */
import "./compras.css";
import { emitirXpUpdate } from "@/lib/xpEmitter";

/* ======================================================
   TIPAGEM DOS DADOS QUE VÊM DA API
====================================================== */
type CompraRow = {
  id: string;
  status?: string;
  data_evento?: string;
  data_update?: string;
  link_rastreado?: string;
  produto_nome?: string;
  produto_vendas?: number;
  ganho_pontos?: number;
  marketplace?: "SHOPEE" | "MERCADO_LIVRE";
  data_previsao_conclusao?: string;
};

function normalizarStatus(status?: string) {
  if (!status) return status;

  switch (status) {
    case "PENDING":
      return "EM_ANALISE";
    case "COMPLETED":
      return "CONFIRMADO_FINAL";
    case "CANCELLED":
      return "CANCELADO_DEFINITIVO";
    case "UNPAID":
      return "EM_ANALISE";
    default:
      return status;
  }
}


export default function Compras() {
  /* ======================================================
     ESTADOS DA TELA
  ====================================================== */
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // controla qual evento abriu o modal
  const [modalEventoId, setModalEventoId] = useState<string | null>(null);

  // texto digitado pelo usuário no modal
  const [relato, setRelato] = useState("");

  // arquivo selecionado no modal
  const [arquivo, setArquivo] = useState<File | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  /* ======================================================
     UTILITÁRIOS / HELPERS
  ====================================================== */
  function formatDate(dt?: string) {
    if (!dt) return "-";
    try {
      const d = new Date(dt);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return dt;
    }
  }

  function calcularPrazoRestante(
    dataBase?: string,
    tipo?: "PROVA" | "CONFIRMACAO" | "CANCELAMENTO"
  ) {
    if (!dataBase) return null;

    // ⏱️ dias conforme o tipo
    let diasLimite = 14;
    let prefixo = "Prazo";

    if (tipo === "PROVA") {
      diasLimite = 13;
      prefixo = "Prazo para envio";
    }

    if (tipo === "CONFIRMACAO") {
      diasLimite = 13;
      prefixo = "Prazo para confirmar";
    }

    if (tipo === "CANCELAMENTO") {
      diasLimite = 6; // 🔥 regra nova
      prefixo = "Prazo para responder";
    }

    const inicio = new Date(dataBase).getTime();
    const agora = Date.now();

    const limite = inicio + diasLimite * 24 * 60 * 60 * 1000;
    const diff = limite - agora;

    if (diff <= 0) {
      return {
        expirado: true,
        dias: 0,
        texto: "Prazo encerrado",
      };
    }

    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return {
      expirado: false,
      dias,
      texto: `${prefixo}: ${dias} dia${dias > 1 ? "s" : ""}`,
    };
  }

  /* ======================================================
     FUNÇÕES DE AÇÃO (BACKEND)
     - chamam as APIs que você já tem
     - ATENÇÃO: agora NÃO enviamos user_id no body (server lê do cookie)
  ====================================================== */
  async function acaoConfirmar(eventoId: string) {
    try {
      const res = await fetch("/api/compras/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ evento_id: eventoId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error || "Erro ao confirmar compra");
        return;
      }

      const json = await res.json();
      emitirXpUpdate(json);
      await loadCompras();
    } catch (e) {
      alert("Erro de conexão com o servidor");
    }
  }

  async function acaoDescartar(eventoId: string) {
    try {
      const res = await fetch("/api/compras/descartar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ evento_id: eventoId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error || "Erro ao descartar compra");
        return;
      }

      await loadCompras(page);
    } catch (e) {
      alert("Erro de conexão com o servidor");
    }
  }

  // abre modal para envio de documento
  function acaoEnviarProva(eventoId: string) {
    setModalEventoId(eventoId);
    setRelato("");
    setArquivo(null);
  }

  // confirma cancelamento
  async function acaoConfirmarCancelamento(eventoId: string) {
    try {
      const res = await fetch("/api/compras/confirmar-cancelamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ evento_id: eventoId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error || "Erro ao confirmar cancelamento");
        return;
      }

      await loadCompras(page);
    } catch (e) {
      alert("Erro de conexão com o servidor");
    }
  }

  // nega cancelamento (volta para análise)
  async function acaoNegarCancelamento(eventoId: string) {
    try {
      const res = await fetch("/api/compras/negar-cancelamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ evento_id: eventoId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error || "Erro ao negar cancelamento");
        return;
      }

      await loadCompras(page);
    } catch (e) {
      alert("Erro de conexão com o servidor");
    }
  }

  /* ======================================================
     UPLOAD DO COMPROVANTE (quando o usuário clica Enviar no modal)
     - envia arquivo + relato
     - NÃO envia user_id (server liga ao auth via cookie)
  ====================================================== */
  async function uploadComprovante() {
    if (!modalEventoId) return;
    if (!arquivo) {
      alert("Selecione um arquivo");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("evento_id", modalEventoId);
      formData.append("file", arquivo);
      formData.append("resposta", relato);

      const res = await fetch("/api/compras/upload-prova", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "Erro");
        alert(err || "Erro ao enviar documentos");
        return;
      }

      // fecha modal e atualiza lista
      setModalEventoId(null);
      await loadCompras(page);
    } catch (e) {
      alert("Erro de conexão com o servidor");
    }
  }

  /* ======================================================
     BADGE DE STATUS
     - agora usa classes para estilização (ver compras.css)
  ====================================================== */
  function renderStatusBadge(status?: string) {
    if (!status) return null;

    let label = status;
    switch (status) {
      case "EM_ANALISE":
        label = "Em análise";
        break;
      case "AGUARDANDO_CONFIRMACAO":
        label = "Aguardando confirmação";
        break;
      case "SOLICITAR_PROVA":
        label = "Enviar comprovante";
        break;
      case "ANALISE_MANUAL":
        label = "Análise manual";
        break;
      case "CONFIRMADO_PELO_USUARIO":
        label = "Confirmação recebida";
        break;
      case "AGUARDANDO_RESPOSTA_CANCELADO":
        label = "Cancelamento detectado";
        break;
      case "CONFIRMADO_FINAL":
        label = "Concluído";
        break;
      case "CANCELADO_DEFINITIVO":
        label = "Cancelado";
        break;
      case "DESCARTADO":
        label = "Não realizada";
        break;
      default:
        label = status;
    }

    // classe específica por status (css define cores)
    const cls = `status-badge status-${status ?? "unknown"}`;

    return <span className={cls}>{label}</span>;
  }

  /* ======================================================
     MENSAGEM HUMANA POR STATUS
  ====================================================== */
  function renderStatusMensagem(status?: string) {
    switch (status) {
      case "AGUARDANDO_CONFIRMACAO":
        return "Confirme se você realizou essa compra.";
      case "CONFIRMADO_PELO_USUARIO":
        return "Recebemos sua confirmação.";
      case "SOLICITAR_PROVA":
        return "Envie o comprovante dentro do prazo para validarmos.";
      case "EM_ANALISE":
        return "Estamos analisando essa compra.";
      case "ANALISE_MANUAL":
        return "Nossa equipe está analisando.";
      case "AGUARDANDO_RESPOSTA_CANCELADO":
        return "Detectamos o cancelamento dessa compra. Confirme se foi você quem cancelou.";
      case "CANCELADO_DEFINITIVO":
        return "Essa compra foi cancelada.";
      case "DESCARTADO":
        return "Conforme a resposta do usuário essa compra não foi concluída.";
      default:
        return null;
    }
  }

  /* ======================================================
     AÇÕES DISPONÍVEIS POR STATUS
     - usa classes de botão definidas no CSS
  ====================================================== */
  function renderAcoes(item: CompraRow) {
    if (item.status === "AGUARDANDO_CONFIRMACAO") {
      const prazo = calcularPrazoRestante(item.data_update || item.data_evento);

      if (prazo?.expirado) {
        return (
          <span style={{ color: "#f87171", fontWeight: 700 }}>
            Prazo encerrado
          </span>
        );
      }

      return (
        <div className="actions-row">
          <button className="btn btn-primary" onClick={() => acaoConfirmar(item.id)}>
            Sim, comprei
          </button>
          <button className="btn btn-secondary" onClick={() => acaoDescartar(item.id)}>
            Não comprei
          </button>
        </div>
      );
    }

    if (item.status === "SOLICITAR_PROVA") {
      const prazo = calcularPrazoRestante(item.data_update || item.data_evento);

      if (prazo?.expirado) {
        return (
          <span style={{ color: "#f87171", fontWeight: 700 }}>
            Prazo encerrado
          </span>
        );
      }

      return (
        <button
          className="btn btn-primary"
          onClick={() => acaoEnviarProva(item.id)}
        >
          Enviar documentos
        </button>
      );
    }

    if (item.status === "AGUARDANDO_RESPOSTA_CANCELADO") {
      const prazo = calcularPrazoRestante(item.data_update || item.data_evento, "CANCELAMENTO");

      if (prazo?.expirado) {
        return (
          <span style={{ color: "#f87171", fontWeight: 700 }}>
            Prazo encerrado
          </span>
        );
      }

      return (
        <div className="actions-row">
          <button className="btn btn-primary" onClick={() => acaoConfirmarCancelamento(item.id)}>
            Sim, Cancelei
          </button>

          <button className="btn btn-secondary" onClick={() => acaoNegarCancelamento(item.id)}>
            Não Cancelei
          </button>
        </div>
      );
    }

    return <span className="empty-cell">—</span>;
  }

  /* ======================================================
     Calcular dias restantes para conclusão
  ====================================================== */
function calcularPrevisaoConclusao(
  dataEvento?: string,
  marketplace?: "SHOPEE" | "MERCADO_LIVRE"
) {
  if (!dataEvento) return null;

  // ✅ Regra fixa para Shopee
  if (marketplace === "SHOPEE") {
    return {
      tipo: "fixo" as const,
      textoPrincipal: "Prazo de até 30 dias",
      textoSecundario: "A análise da Shopee pode levar até 30 dias.",
    };
  }

  // ✅ Regra padrão para Mercado Livre
  const inicio = new Date(dataEvento).getTime();

  // 90 dias após a data do evento
  const previsao = inicio + 90 * 24 * 60 * 60 * 1000;

  const agora = Date.now();
  const diff = previsao - agora;

  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return {
    tipo: "calculado" as const,
    dataFormatada: new Date(previsao).toLocaleDateString("pt-BR"),
    dias,
    expirado: diff <= 0,
  };
}



  /* ======================================================
     CARREGAMENTO DOS DADOS (useEffect)
  ====================================================== */
    async function loadCompras(currentPage = page) {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/compras", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: currentPage,
            limit,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erro ao carregar compras" }));
          setError(err.error || "Erro ao carregar compras");
          setCompras([]);
          setTotalCount(0);
          setTotalPages(1);
          return;
        }

        const json = await res.json();

        emitirXpUpdate(json);

        const dadosNormalizados = (json.data || []).map((item: any) => ({
          ...item,
          status: normalizarStatus(item.status),
        }));

        setCompras(dadosNormalizados);
        setTotalCount(typeof json.count === "number" ? json.count : 0);
        setTotalPages(json.totalPages || 1);
      } catch (e) {
        setError("Erro de conexão com o servidor");
        setCompras([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      loadCompras(page);
    }, [page]);

    useEffect(() => {
      if (modalEventoId) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }

      return () => {
        document.body.style.overflow = "";
      };
    }, [modalEventoId]);

  /* ======================================================
     JSX (PARTE VISUAL)
     - classes referenciam compras.css
  ====================================================== */
  return (
    <div className="dashboard-container compras-root">
      <div className="dashboard-card compras-card">
        <div className="dashboard-glow" />

        <div className="dashboard-content compras-content">
          <div className="compras-header">
            <div>
              <h2 className="compras-title">Compras em Análise</h2>
              <p className="compras-subtitle">
                Aqui você acompanha o status da sua compra.
              </p>
            </div>
          </div>

          {loading && <p className="loading-text">Carregando compras...</p>}
          {error && <div className="dashboard-error">{error}</div>}

          {!loading && !error && compras.length === 0 && (
            <p className="empty-state">Nenhuma compra em análise.</p>
          )}

        <div className="compras-meta">
          <div className="compras-total">
            Mostrando <span className="muted-number">{compras.length}</span> de{" "}
            <span className="muted-number">{totalCount ?? 0}</span>
          </div>
        </div>

      {!loading && compras.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="compras-table">
              <thead>
                <tr>
                  <th className="col-produto">Produto</th>
                  <th className="col-status">Status</th>
                  <th className="col-valor">Valor</th>
                  <th className="col-ganho">Ganho</th>
                  <th className="col-data-evento">Data</th>
                  <th className="col-data-update">Data Atualização</th>
                  <th className="col-acoes">Ações</th>
                </tr>
              </thead>

              <tbody>
                {compras.map((item) => {
                  const prazo =
                    item.status === "SOLICITAR_PROVA"
                      ? calcularPrazoRestante(item.data_update || item.data_evento, "PROVA")
                      : item.status === "AGUARDANDO_CONFIRMACAO"
                      ? calcularPrazoRestante(item.data_update || item.data_evento, "CONFIRMACAO")
                      : item.status === "AGUARDANDO_RESPOSTA_CANCELADO"
                      ? calcularPrazoRestante(item.data_update || item.data_evento, "CANCELAMENTO")
                      : null;

                  return (
                    <tr key={item.id} className="compras-row">
                      <td className="product-cell">
                        <div className="product-title">{item.produto_nome ?? "Produto não identificado"}</div>
                        <div className="product-sub">{item.link_rastreado}</div>
                      </td>

                      <td className="status-cell">
                        <div className="status-tooltip">
                          {renderStatusBadge(item.status)}

                          {renderStatusMensagem(item.status) && (
                            <div className="status-tooltip-content">
                              {renderStatusMensagem(item.status)}
                            </div>
                          )}
                        </div>

                        {(item.status === "SOLICITAR_PROVA" ||
                          item.status === "AGUARDANDO_CONFIRMACAO" ||
                          item.status === "AGUARDANDO_RESPOSTA_CANCELADO") &&
                          prazo && (
                            <div
                              className="status-prazo"
                              style={{
                                color: prazo.expirado
                                  ? "#f87171"
                                  : prazo.dias <= 5
                                  ? "#ff624a"
                                  : "#fdab38",
                              }}
                            >
                              ⏰ {prazo.texto}
                            </div>
                          )}

                          {item.status === "EM_ANALISE" &&
                            item.data_evento &&
                            (() => {
                              const previsao = calcularPrevisaoConclusao(
                                item.data_evento,
                                item.marketplace
                              );

                              if (!previsao) return null;

                              // ✅ Caso Shopee: texto fixo
                              if (previsao.tipo === "fixo") {
                                return (
                                  <div
                                    className="status-previsao"
                                    style={{
                                      marginTop: 6,
                                      fontSize: 12,
                                      color: "#a3a3a3",
                                    }}
                                  >
                                    <div>{previsao.textoPrincipal}</div>
                                    <div>{previsao.textoSecundario}</div>
                                  </div>
                                );
                              }

                              // ✅ Caso Mercado Livre: previsão calculada
                              return (
                                <div
                                  className="status-previsao"
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12,
                                    color: previsao.expirado ? "#22c55e" : "#a3a3a3",
                                  }}
                                >
                                  <div>Previsão: {previsao.dataFormatada}</div>

                                  <div>
                                    {previsao.expirado
                                      ? "Pode ser concluído a qualquer momento"
                                      : `Faltam ${previsao.dias} dia${previsao.dias > 1 ? "s" : ""} 🕐`}
                                  </div>
                                </div>
                              );
                            })()}
                      </td>

                      <td className="numeric-cell-VALOR">
                        {typeof item.produto_vendas === "number"
                          ? `R$ ${item.produto_vendas.toFixed(2)}`
                          : "-"}
                      </td>

                      <td className="numeric-cell-GANHO">
                        {typeof item.ganho_pontos === "number"
                          ? `${Math.round(item.ganho_pontos * 100)}`
                          : "-"}
                      </td>

                      <td className="date-cell">{formatDate(item.data_evento)}</td>
                      <td className="date-cell">{formatDate(item.data_update)}</td>

                      <td className="actions-cell">{renderAcoes(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ⬅ Anterior
            </button>

            <span className="pagination-info">
              <strong>Página</strong>
              <span>{page} de {totalPages}</span>
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima ➡
            </button>
          </div>
        </>
      )}
        </div>
      </div>

      {/* =======================
         MODAL ENVIO DE DOCUMENTOS
      ======================= */}
      {modalEventoId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Enviar documentos</h3>
              <button className="modal-close" onClick={() => setModalEventoId(null)} aria-label="Fechar modal">✕</button>
            </div>

            <p className="modal-desc">
              Identificamos uma divergência nesta compra. Para continuarmos com a análise,
              descreva o ocorrido e envie um comprovante (nota, pedido ou recibo).
            </p>

            <label className="modal-label-descricao">Você fez essa compra?</label>
            <textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              rows={2}
              placeholder="Explique brevemente o ocorrido..."
              className="modal-textarea"
            />

            <label className="modal-label-file">Anexar documentos prova de compra</label>
            <div className="modal-file">
              <input
                id="file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </div>

            <div className="modal-actions">
                {(() =>
                {
                  const eventoAtual = compras.find(c => c.id === modalEventoId);

                  const prazo = calcularPrazoRestante(
                    eventoAtual?.data_update || eventoAtual?.data_evento,
                    eventoAtual?.status === "SOLICITAR_PROVA"
                      ? "PROVA"
                      : eventoAtual?.status === "AGUARDANDO_CONFIRMACAO"
                      ? "CONFIRMACAO"
                      : undefined
                  );

                  if (!prazo) return null;

                  return (
                    <div className="modal-prazo"
                      style={{
                        color: prazo.expirado ? "#f87171" : prazo.dias <= 5 ? "#ff624a" : "#fdab38",
                      }}
                    > 
                      ⏰ {prazo.texto}
                    </div>
                  );
                })()}
              <button className="btn btn-cta" onClick={uploadComprovante}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
