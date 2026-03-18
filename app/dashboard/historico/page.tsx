"use client";

import React, { useEffect, useState } from "react";
import "./historico.css";

type LinkRow = {
  id: string;
  produto_nome?: string;
  produto_url?: string;
  link_rastreado?: string;
  valor?: number;
  pontos?: number;
  data_criacao?: string;
};

export default function Historico() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/historico", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page,
            limit,
          }),
        });

        if (res.status === 401) {
          setError("Usuário não autenticado.");
          setLinks([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "Erro desconhecido");
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const json = await res.json();

        // A API pode retornar { data: [...], count } ou diretamente um array [...]
        if (Array.isArray(json)) {
          setLinks(json as LinkRow[]);
          setTotalCount((json as any).length || 0);
        } else if (json && Array.isArray(json.data)) {
          setLinks(json.data as LinkRow[]);
          setTotalPages(json.totalPages || 1);
          setTotalCount(typeof json.count === "number" ? json.count : json.data.length);
        } else {
          // formato inesperado
          console.warn("Formato inesperado na resposta /api/historico:", json);
          setLinks([]);
          setTotalCount(0);
        }
      } catch (err: any) {
        console.error("Erro ao buscar histórico:", err);
        setError("Erro ao buscar histórico");
        setLinks([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [page]);

  function formatDate(dt?: string) {
    if (!dt) return "-";
    try {
      const d = new Date(dt);
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return dt;
    }
  }

  function formatCurrency(value?: number) {
    if (typeof value !== "number") return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

    return (
    <div className="historico-root">
      <div className="historico-card">
        <div className="historico-content">

          {/* HEADER */}
          <div className="historico-header">
            <div>
              <h2 className="historico-title">Histórico de Links</h2>
              <p className="historico-subtitle">
                Todos os links que você já gerou
              </p>
            </div>
          </div>

          {/* ESTADOS */}
          {loading && <p>Carregando histórico...</p>}
          {error && <div className="dashboard-error">{error}</div>}

          {!loading && !error && links.length === 0 && (
            <p>Nenhum link encontrado.</p>
          )}

          {!loading && links.length > 0 && (
            <>
              {/* META */}
              <div className="historico-meta">
                <span className="historico-total">
                  {typeof totalCount === "number" ? `Total: ${totalCount}` : ""}
                </span>
              </div>

              {/* TABELA */}
              <div className="historico-table-wrapper">
                <table className="historico-table">
                  <thead>
                    <tr>
                      <th className="col-produto">Produto</th>
                      <th className="col-link">Link</th>
                      <th className="col-valor">Valor</th>
                      <th className="col-ganho">Ganho Estimado</th>
                      <th className="col-data">Criado em</th>
                      <th className="col-acoes">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {links.map((item) => (
                      <tr key={item.id} className="historico-row">
                        <td className="col-produto">
                          {item.produto_nome || "-"}
                        </td>

                        <td className="col-link">
                          <a
                            href={item.link_rastreado || item.produto_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.link_rastreado ?? item.produto_url ?? "-"}
                          </a>
                        </td>

                        <td className="numeric-cell-VALOR">
                          {formatCurrency(item.valor)}
                        </td>

                        <td className="numeric-cell-GANHO">
                          {typeof item.pontos === "number"
                            ? Math.round(item.pontos).toString()
                            : "-"}
                        </td>

                        <td className="date-cell">
                          {formatDate(item.data_criacao)}
                        </td>

                        <td className="actions-cell">
                          <div className="actions-row">
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                const url =
                                  item.link_rastreado || item.produto_url;
                                if (!url) {
                                  alert("Sem link para abrir");
                                  return;
                                }
                                window.open(url, "_blank");
                              }}
                            >
                              Abrir
                            </button>

                            <button
                              className={`btn ${
                                copiadoId === item.id ? "btn-success" : "btn-secondary"
                              }`}
                              onClick={() => {
                                const toCopy =
                                  item.link_rastreado ||
                                  item.produto_url ||
                                  "";

                                if (!toCopy) {
                                  alert("Sem link para copiar");
                                  return;
                                }

                                navigator.clipboard?.writeText(toCopy).then(() => {
                                  setCopiadoId(item.id);

                                  setTimeout(() => {
                                    setCopiadoId(null);
                                  }, 2000);
                                });
                              }}
                            >
                              {copiadoId === item.id ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
    </div>
  );
}
