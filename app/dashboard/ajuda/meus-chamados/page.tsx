"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./meus-chamados.css";

type Chamado = {
  id: string;
  titulo: string | null;
  mensagem: string;
  imagem_path: string | null;
  imagem_url?: string | null;
  status: string;
  criado_em: string;
  data_update: string;
};

function formatarData(data: string) {
  try {
    return new Date(data).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return data;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ABERTO":
      return "Aberto";
    case "EM_ANALISE":
      return "Em análise";
    case "RESPONDIDO":
      return "Respondido";
    case "RESOLVIDO":
      return "Resolvido";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "ABERTO":
      return "status-aberto";
    case "EM_ANALISE":
      return "status-analise";
    case "RESPONDIDO":
      return "status-respondido";
    case "RESOLVIDO":
      return "status-resolvido";
    default:
      return "status-default";
  }
}

export default function MeusChamadosPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function carregarChamados() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/chamados/listar", {
          method: "GET",
          credentials: "include",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Erro ao carregar chamados.");
        }

        setChamados(json.chamados || []);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar chamados.");
      } finally {
        setLoading(false);
      }
    }

    carregarChamados();
  }, []);

  return (
    <div className="meus-chamados-root">
      <div className="dashboard-container">
        <div className="meus-chamados-shell">
          <section className="meus-chamados-hero">
            <div className="meus-chamados-badge">Suporte premium</div>
            <h1>Meus Chamados</h1>
            <p>
              Acompanhe seus protocolos, visualize o andamento do suporte e
              consulte os anexos enviados em cada atendimento.
            </p>
          </section>

          <section className="meus-chamados-topbar">
            <Link href="/ajuda" className="btn-secundario">
              ← Voltar para Ajuda
            </Link>

            <Link href="/ajuda" className="btn-primario">
              + Abrir novo chamado
            </Link>
          </section>

          {loading && (
            <div className="estado-card">
              <p>Carregando seus chamados...</p>
            </div>
          )}

          {!loading && error && (
            <div className="estado-card erro">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && chamados.length === 0 && (
            <div className="estado-card vazio">
              <h2>Nenhum chamado encontrado</h2>
              <p>
                Você ainda não abriu nenhum chamado. Quando precisar de ajuda,
                abra seu primeiro atendimento pela Central de Ajuda.
              </p>

              <Link href="/ajuda" className="btn-primario">
                Abrir chamado
              </Link>
            </div>
          )}

          {!loading && !error && chamados.length > 0 && (
            <div className="chamados-grid">
              {chamados.map((chamado) => {
                const expandido = expandedId === chamado.id;

                return (
                  <article key={chamado.id} className="chamado-card">
                    <div className="chamado-card-top">
                      <div className="chamado-protocolo">
                        Protocolo: <strong>{chamado.id}</strong>
                      </div>

                      <span
                        className={`status-badge ${getStatusClass(
                          chamado.status
                        )}`}
                      >
                        {getStatusLabel(chamado.status)}
                      </span>
                    </div>

                    <h2 className="chamado-titulo">
                      {chamado.titulo?.trim()
                        ? chamado.titulo
                        : "Chamado sem título"}
                    </h2>

                    <div className="chamado-meta">
                      <span>Criado em: {formatarData(chamado.criado_em)}</span>
                      <span>
                        Atualizado em: {formatarData(chamado.data_update)}
                      </span>
                    </div>

                    <p className="chamado-preview">
                      {chamado.mensagem.length > 150
                        ? `${chamado.mensagem.slice(0, 150)}...`
                        : chamado.mensagem}
                    </p>

                    <button
                      type="button"
                      className="btn-expandir"
                      onClick={() =>
                        setExpandedId(expandido ? null : chamado.id)
                      }
                    >
                      {expandido ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>

                    {expandido && (
                      <div className="chamado-detalhes">
                        <div className="detalhe-bloco">
                          <span className="detalhe-kicker">Mensagem enviada</span>
                          <p>{chamado.mensagem}</p>
                        </div>

                        {chamado.imagem_url && (
                          <div className="detalhe-bloco">
                            <span className="detalhe-kicker">Imagem anexada</span>

                            <a
                              href={chamado.imagem_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="imagem-link"
                            >
                              <img
                                src={chamado.imagem_url}
                                alt="Imagem anexada ao chamado"
                                className="chamado-imagem"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}