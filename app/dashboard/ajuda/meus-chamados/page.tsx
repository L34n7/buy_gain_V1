"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./meus-chamados.css";

type MensagemChamado = {
  id: string;
  chamado_id: string;
  user_id: string | null;
  admin_id: string | null;
  autor_tipo: "USER" | "ADMIN";
  mensagem: string;
  imagem_path: string | null;
  imagem_url?: string | null;
  criado_em: string;
};

type Chamado = {
  id: string;
  titulo: string | null;
  status: string;
  criado_em: string;
  mensagens: MensagemChamado[];
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
    case "FINALIZADO":
      return "Finalizado";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "ABERTO":
      return "estatus-aberto";
    case "EM_ANALISE":
      return "estatus-analise";
    case "RESPONDIDO":
      return "estatus-respondido";
    case "FINALIZADO":
      return "estatus-finalizado";
    default:
      return "estatus-default";
  }
}

export default function MeusChamadosPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAnexoId, setExpandedAnexoId] = useState<string | null>(null);

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviandoRespostaId, setEnviandoRespostaId] = useState<string | null>(
    null
  );
  const [erroResposta, setErroResposta] = useState<Record<string, string>>({});

  const [imagemFiles, setImagemFiles] = useState<Record<string, File | null>>(
    {}
  );
  const [imagemPreviews, setImagemPreviews] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    async function carregarChamados() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/chamados/listar", {
          method: "GET",
          credentials: "include",
        });

        let json: any = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }

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

    return () => {
      Object.values(imagemPreviews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  async function recarregarChamados(manterExpandidoId?: string) {
    try {
      setError(null);

      const res = await fetch("/api/chamados/listar", {
        method: "GET",
        credentials: "include",
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json.error || "Erro ao recarregar chamados.");
      }

      setChamados(json.chamados || []);

      if (manterExpandidoId) {
        setExpandedId(manterExpandidoId);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao recarregar chamados.");
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function atualizarImagemResposta(chamadoId: string, file: File | null) {
    if (!file) {
      setImagemFiles((prev) => ({ ...prev, [chamadoId]: null }));
      setImagemPreviews((prev) => ({ ...prev, [chamadoId]: "" }));
      return;
    }

    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];
    const maxBytes = 5 * 1024 * 1024; // 5MB

    if (!tiposPermitidos.includes(file.type)) {
      setErroResposta((prev) => ({
        ...prev,
        [chamadoId]: "Formato inválido. Use JPG, PNG ou WEBP.",
      }));
      return;
    }

    if (file.size > maxBytes) {
      setErroResposta((prev) => ({
        ...prev,
        [chamadoId]: "A imagem deve ter no máximo 5MB.",
      }));
      return;
    }

    // limpa erro
    setErroResposta((prev) => ({ ...prev, [chamadoId]: "" }));

    setImagemFiles((prev) => ({
      ...prev,
      [chamadoId]: file,
    }));

    setImagemPreviews((prev) => {
      const previewAntigo = prev[chamadoId];
      if (previewAntigo) URL.revokeObjectURL(previewAntigo);

      return {
        ...prev,
        [chamadoId]: URL.createObjectURL(file),
      };
    });
  }

  async function enviarResposta(chamadoId: string) {
    const mensagem = (respostas[chamadoId] || "").trim();
    const imagemFile = imagemFiles[chamadoId] || null;

    if (!mensagem) {
      setErroResposta((prev) => ({
        ...prev,
        [chamadoId]: "Digite uma mensagem antes de enviar.",
      }));
      return;
    }

    if (mensagem.length < 3) {
      setErroResposta((prev) => ({
        ...prev,
        [chamadoId]: "A resposta deve ter pelo menos 3 caracteres.",
      }));
      return;
    }

    try {
      setEnviandoRespostaId(chamadoId);
      setErroResposta((prev) => ({ ...prev, [chamadoId]: "" }));

      let imagemBase64: string | null = null;
      let imagemNome: string | null = null;
      let imagemTipo: string | null = null;

      if (imagemFile) {
        imagemBase64 = await fileToBase64(imagemFile);
        imagemNome = imagemFile.name;
        imagemTipo = imagemFile.type;
      }

      const res = await fetch(`/api/chamados/${chamadoId}/responder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mensagem,
          imagemBase64,
          imagemNome,
          imagemTipo,
        }),
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json.error || "Erro ao enviar resposta.");
      }

      setRespostas((prev) => ({
        ...prev,
        [chamadoId]: "",
      }));

      atualizarImagemResposta(chamadoId, null);

      setExpandedAnexoId(null);
      await recarregarChamados(chamadoId);
    } catch (err: any) {
      setErroResposta((prev) => ({
        ...prev,
        [chamadoId]: err.message || "Erro ao enviar resposta.",
      }));
    } finally {
      setEnviandoRespostaId(null);
    }
  }

  return (
    <div className="meus-chamados-root">
      <div className="dashboard-container">
        <div className="meus-chamados-shell">
          <section className="meus-chamados-hero">
            <span className="meus-chamados-badge">Central de ajuda</span>
            <h1>Meus Chamados</h1>
            <p>
              Acompanhe protocolos, status do atendimento, atualizações e anexos
              enviados em um só lugar.
            </p>
          </section>

          <section className="meus-chamados-topbar">
            <Link href="/dashboard/ajuda" className="btn-secundario">
              ← Voltar para Central de Ajuda
            </Link>

            <Link href="/dashboard/ajuda" className="btn-primario">
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
              <h2>Não foi possível carregar</h2>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && chamados.length === 0 && (
            <div className="estado-card vazio">
              <h2>Nenhum chamado encontrado</h2>
              <p>
                Você ainda não abriu nenhum chamado. Quando precisar, abra seu
                primeiro atendimento pela Central de Ajuda.
              </p>

              <Link href="/dashboard/ajuda" className="btn-primario">
                Abrir chamado
              </Link>
            </div>
          )}

          {!loading && !error && chamados.length > 0 && (
            <section className="chamados-lista">
              {chamados.map((chamado) => {
                const expandido = expandedId === chamado.id;
                const mensagens = chamado.mensagens || [];
                const temRespostaDoAdmin = mensagens.some(
                  (msg) => msg.autor_tipo === "ADMIN"
                );
                const podeResponder =
                  chamado.status !== "FINALIZADO" && temRespostaDoAdmin;

                return (
                  <article key={chamado.id} className="chamado-item">
                    <div className="chamado-head">
                      <div className="chamado-head-left">
                        <div className="chamado-top-row">
                          <div className="chamado-protocolo-wrap">
                            <span className="chamado-protocolo-label">
                              Protocolo
                            </span>
                            <div className="chamado-protocolo">
                              <strong>{chamado.id}</strong>
                            </div>
                          </div>

                          <span
                            className={`estatus-badge ${getStatusClass(
                              chamado.status
                            )}`}
                          >
                            {getStatusLabel(chamado.status)}
                          </span>
                        </div>

                        <h2>
                          {chamado.titulo?.trim()
                            ? chamado.titulo
                            : "Chamado sem título"}
                        </h2>

                        <div className="chamado-meta">
                          <span>Criado em: {formatarData(chamado.criado_em)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-expandir"
                        onClick={() => {
                          if (expandido) {
                            setExpandedId(null);
                            setExpandedAnexoId(null);
                          } else {
                            setExpandedId(chamado.id);
                            setExpandedAnexoId(null);
                            setErroResposta((prev) => ({
                              ...prev,
                              [chamado.id]: "",
                            }));
                          }
                        }}
                      >
                        {expandido ? "Ocultar detalhes" : "Ver detalhes"}
                      </button>
                    </div>

                    {expandido && (
                      <div className="chamado-body">
                        <div className="chamado-bloco">
                          <span className="chamado-kicker">Conversa</span>

                          <div className="conversa-lista">
                            {mensagens.length === 0 && (
                              <p>Nenhuma mensagem encontrada neste chamado.</p>
                            )}

                            {mensagens.map((msg) => {
                              const mostrarAnexo =
                                expandedAnexoId === msg.id && !!msg.imagem_url;

                              return (
                                <div
                                  key={msg.id}
                                  className={`mensagem-item ${
                                    msg.autor_tipo === "ADMIN"
                                      ? "mensagem-admin"
                                      : "mensagem-user"
                                  }`}
                                >
                                  <div className="mensagem-topo">
                                    <strong>
                                      {msg.autor_tipo === "ADMIN"
                                        ? "Suporte"
                                        : "Você"}
                                    </strong>
                                    <span>{formatarData(msg.criado_em)}</span>
                                  </div>

                                  <p>{msg.mensagem}</p>

                                  {msg.imagem_url && (
                                    <div className="mensagem-anexo">
                                      <div className="anexo-header">
                                        <div>
                                          <span className="chamado-kicker">
                                            Anexo
                                          </span>
                                          <h3>Imagem enviada</h3>
                                        </div>

                                        <button
                                          type="button"
                                          className="btn-anexo-toggle"
                                          onClick={() =>
                                            setExpandedAnexoId(
                                              mostrarAnexo ? null : msg.id
                                            )
                                          }
                                        >
                                          {mostrarAnexo
                                            ? "Ocultar anexo"
                                            : "Expandir anexo"}
                                        </button>
                                      </div>

                                      {mostrarAnexo && (
                                        <a
                                          href={msg.imagem_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="imagem-link"
                                        >
                                          <img
                                            src={msg.imagem_url}
                                            alt="Imagem anexada ao chamado"
                                            className="chamado-imagem"
                                          />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {erroResposta[chamado.id] && (
                          <div className="chamado-bloco chamado-bloco-erro">
                            <p>{erroResposta[chamado.id]}</p>
                          </div>
                        )}

                        {!podeResponder && chamado.status !== "FINALIZADO" && (
                          <div className="chamado-bloco chamado-bloco-aviso">
                            <p>
                              Você poderá responder este chamado assim que o
                              suporte enviar a primeira resposta.
                            </p>
                          </div>
                        )}

                        {podeResponder && (
                          <div className="resposta-box">
                            <span className="chamado-kicker">Responder chamado</span>
                            <h3>Enviar nova mensagem</h3>

                            <textarea
                              className="resposta-textarea"
                              placeholder="Digite sua resposta..."
                              value={respostas[chamado.id] || ""}
                              onChange={(e) =>
                                setRespostas((prev) => ({
                                  ...prev,
                                  [chamado.id]: e.target.value,
                                }))
                              }
                            />

                            {imagemPreviews[chamado.id] && (
                              <div className="anexo-preview-resposta">
                                <img
                                  src={imagemPreviews[chamado.id]}
                                  alt="Prévia da imagem da resposta"
                                />
                              </div>
                            )}



                            <div className="resposta-actions">
                              <span className="resposta-hint">
                                Formatos permitidos: JPG, PNG ou WEBP • Tamanho máximo: 5MB
                              </span>
                              <label className="btn-upload-resposta">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    atualizarImagemResposta(chamado.id, file);
                                  }}
                                />
                                {imagemFiles[chamado.id] ? "Trocar imagem" : "Anexar imagem"}
                              </label>

                              <button
                                type="button"
                                className="btn-primario"
                                disabled={enviandoRespostaId === chamado.id}
                                onClick={() => enviarResposta(chamado.id)}
                              >
                                {enviandoRespostaId === chamado.id ? "Enviando..." : "Enviar resposta"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}